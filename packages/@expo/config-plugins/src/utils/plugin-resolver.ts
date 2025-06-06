import assert from 'assert';
import * as path from 'path';
import resolveFrom from 'resolve-from';

import { PluginError } from './errors';
import { ConfigPlugin, StaticPlugin } from '../Plugin.types';
import { fileExists } from './modules';
// Default plugin entry file name.
export const pluginFileName = 'app.plugin.js';

/**
 * Resolve the config plugin from a node module or package.
 * If the module or package does not include a config plugin, this function throws a `PluginError`.
 * The resolution is done in following order:
 *   1. Is the reference a relative file path or an import specifier with file path? e.g. `./file.js`, `pkg/file.js` or `@org/pkg/file.js`?
 *     - Resolve the config plugin as-is
 *   2. If the reference a module? e.g. `expo-font`
 *     - Resolve the root `app.plugin.js` file within the module, e.g. `expo-font/app.plugin.js`
 *   3. Does the module have a valid config plugin in the `main` field?
 *     - Resolve the `main` entry point as config plugin
 */
export function resolvePluginForModule(
  projectRoot: string,
  pluginReference: string
): { filePath: string; isPluginFile: boolean } {
  if (moduleNameIsDirectFileReference(pluginReference)) {
    // Only resolve `./file.js`, `package/file.js`, `@org/package/file.js`
    const pluginScriptFile = resolveFrom.silent(projectRoot, pluginReference);
    if (pluginScriptFile) {
      return {
        // NOTE(cedric): `path.sep` is required here, we are resolving the absolute path, not the plugin reference
        isPluginFile: pluginScriptFile.endsWith(path.sep + pluginFileName),
        filePath: pluginScriptFile,
      };
    }
  } else if (moduleNameIsPackageReference(pluginReference)) {
    // Only resolve `package -> package/app.plugin.js`, `@org/package -> @org/package/app.plugin.js`
    const pluginPackageFile = resolveFrom.silent(
      projectRoot,
      `${pluginReference}/${pluginFileName}`
    );
    if (pluginPackageFile && fileExists(pluginPackageFile)) {
      return { isPluginFile: true, filePath: pluginPackageFile };
    }
    // Try to resole the `main` entry as config plugin
    const packageMainEntry = resolveFrom.silent(projectRoot, pluginReference);
    if (packageMainEntry) {
      return { isPluginFile: false, filePath: packageMainEntry };
    }
  }

  throw new PluginError(
    `Failed to resolve plugin for module "${pluginReference}" relative to "${projectRoot}". Do you have node modules installed?`,
    'PLUGIN_NOT_FOUND'
  );
}

// TODO: Test windows
function pathIsFilePath(name: string): boolean {
  // Matches lines starting with: . / ~/
  return !!name.match(/^(\.|~\/|\/)/g);
}

export function moduleNameIsDirectFileReference(name: string): boolean {
  if (pathIsFilePath(name)) {
    return true;
  }

  const slashCount = name.split('/')?.length;
  // Orgs (like @expo/config ) should have more than one slash to be a direct file.
  if (name.startsWith('@')) {
    return slashCount > 2;
  }

  // Regular packages should be considered direct reference if they have more than one slash.
  return slashCount > 1;
}

export function moduleNameIsPackageReference(name: string): boolean {
  const slashCount = name.split('/')?.length;
  return name.startsWith('@') ? slashCount === 2 : slashCount === 1;
}

export function normalizeStaticPlugin(plugin: StaticPlugin | ConfigPlugin | string): StaticPlugin {
  if (Array.isArray(plugin)) {
    assert(
      plugin.length > 0 && plugin.length < 3,
      `Wrong number of arguments provided for static config plugin, expected either 1 or 2, got ${plugin.length}`
    );
    return plugin;
  }
  return [plugin, undefined];
}

export function assertInternalProjectRoot(projectRoot?: string): asserts projectRoot {
  assert(
    projectRoot,
    `Unexpected: Config \`_internal.projectRoot\` isn't defined by expo-cli, this is a bug.`
  );
}

// Resolve the module function and assert type
export function resolveConfigPluginFunction(projectRoot: string, pluginReference: string) {
  const { plugin } = resolveConfigPluginFunctionWithInfo(projectRoot, pluginReference);
  return plugin;
}

// Resolve the module function and assert type
export function resolveConfigPluginFunctionWithInfo(projectRoot: string, pluginReference: string) {
  const { filePath: pluginFile, isPluginFile } = resolvePluginForModule(
    projectRoot,
    pluginReference
  );
  let result: any;
  try {
    result = requirePluginFile(pluginFile);
  } catch (error) {
    if (error instanceof SyntaxError) {
      const learnMoreLink = `Learn more: https://docs.expo.dev/guides/config-plugins/#creating-a-plugin`;
      // If the plugin reference is a node module, and that node module has a syntax error, then it probably doesn't have an official config plugin.
      if (!isPluginFile && !moduleNameIsDirectFileReference(pluginReference)) {
        const pluginError = new PluginError(
          `Package "${pluginReference}" does not contain a valid config plugin.\n${learnMoreLink}\n\n${error.message}`,
          'INVALID_PLUGIN_IMPORT'
        );
        pluginError.stack = error.stack;
        throw pluginError;
      }
    }
    throw error;
  }

  const plugin = resolveConfigPluginExport({
    plugin: result,
    pluginFile,
    pluginReference,
    isPluginFile,
  });
  return { plugin, pluginFile, pluginReference, isPluginFile };
}

/**
 * - Resolve the exported contents of an Expo config (be it default or module.exports)
 * - Assert no promise exports
 * - Return config type
 * - Serialize config
 *
 * @param props.plugin plugin results
 * @param props.pluginFile plugin file path
 * @param props.pluginReference the string used to reference the plugin
 * @param props.isPluginFile is file path from the app.plugin.js module root
 */
export function resolveConfigPluginExport({
  plugin,
  pluginFile,
  pluginReference,
  isPluginFile,
}: {
  plugin: any;
  pluginFile: string;
  pluginReference: string;
  isPluginFile: boolean;
}): ConfigPlugin<unknown> {
  if (plugin.default != null) {
    plugin = plugin.default;
  }
  if (typeof plugin !== 'function') {
    const learnMoreLink = `Learn more: https://docs.expo.dev/guides/config-plugins/#creating-a-plugin`;
    // If the plugin reference is a node module, and that node module does not export a function then it probably doesn't have a config plugin.
    if (!isPluginFile && !moduleNameIsDirectFileReference(pluginReference)) {
      throw new PluginError(
        `Package "${pluginReference}" does not contain a valid config plugin. Module must export a function from file: ${pluginFile}\n${learnMoreLink}`,
        'INVALID_PLUGIN_TYPE'
      );
    }
    throw new PluginError(
      `Plugin "${pluginReference}" must export a function from file: ${pluginFile}. ${learnMoreLink}`,
      'INVALID_PLUGIN_TYPE'
    );
  }

  return plugin;
}

function requirePluginFile(filePath: string): any {
  try {
    return require(filePath);
  } catch (error) {
    // TODO: Improve error messages
    throw error;
  }
}
