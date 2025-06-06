# babel-preset-expo

This preset extends the default React Native preset (`@react-native/babel-preset`) and adds support for tree shaking, bundle splitting, React Server Components, Hermes compilation, advanced dead-code elimination, reanimated, Expo DOM components, server-side rendering, and more...

You can use this preset in any React Native project as a drop-in replacement for `@react-native/babel-preset`.

If you have problems with the code in this repository, please file issues & bug reports
at https://github.com/expo/expo.

## Expo Bundler Spec Compliance

A bundler must follow these requirements if they are to be considered spec compliant for use with a **universal React** (Expo) project.

## Options

### `react-compiler`

Settings to pass to `babel-plugin-react-compiler`. Set as `false` to disable the plugin. As of SDK 51, you must also enable `experiments.reactCompiler: true` in the `app.json`.

```js
[
  'babel-preset-expo',
  {
    'react-compiler': {
      sources: (filename) => {
        // Match file names to include in the React Compiler.
        return filename.includes('src/path/to/dir');
      },
    },
  },
];
```

### `minifyTypeofWindow`

Set `minifyTypeofWindow: true` to transform `typeof window` checks in your code, e.g. `if (typeof window === 'object')` -> `if (true)` in clients. This is useful when you're using libraries that mock the window object on native or in the server.

```js
[
  'babel-preset-expo',
  {
    // If your native app doesn't polyfill `window` then setting this to `false` can reduce bundle size.
    native: {
      minifyTypeofWindow: true,
    },
  },
];
```

Defaults to `true` for server environments, and `false` for client environments to support legacy browser polyfills and web workers.

### `reanimated`

`boolean`, defaults to `true`. Set `reanimated: false` to disable adding the `react-native-reanimated/plugin` when `react-native-reanimated` is installed.

### `worklets`

`boolean`, `boolean`, defaults to `true`. Set `worklets: false` to disable adding the `react-native-worklets/plugin` when `react-native-worklets` is installed. Applies only when using standalone `react-native-worklets` or `react-native-reanimated 4`.

### [`jsxRuntime`](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx#runtime)

`classic | automatic`, defaults to `automatic`

- `automatic` automatically convert JSX to JS without the need to `import React from 'react'` in every file. Be sure to follow the rest of the [setup guide](https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html#how-to-upgrade-to-the-new-jsx-transform) after enabling this, otherwise ESLint and other tools will throw warnings.
- `classic` does not automatically import anything, React must imported into every file that uses JSX syntax.

```js
[
  'babel-preset-expo',
  {
    jsxRuntime: 'classic',
  },
];
```

This property is passed down to [`@babel/plugin-transform-react-jsx`](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx). This flag does nothing when `useTransformReactJSXExperimental` is set to `true` because `@babel/plugin-transform-react-jsx` is omitted.

### [`jsxImportSource`](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx#importsource)

`string`, defaults to `react`

This option allows specifying a custom import source for importing functions.

```js
[
  'babel-preset-expo',
  {
    jsxRuntime: 'automatic',
    jsxImportSource: 'react',
  },
];
```

This property is passed down to [`@babel/plugin-transform-react-jsx`](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx). This options does nothing when `jsxRuntime` is not set to `automatic`.

### [`lazyImports`](https://babeljs.io/docs/en/babel-plugin-transform-modules-commonjs#lazy)

Changes Babel's compiled `import` statements to be lazily evaluated when their imported bindings are used for the first time.

_Note:_ this option has an effect only when the `disableImportExportTransform` option is set to `false`. On Android and iOS, `disableImportExportTransform` defaults to `false`, and on web it defaults to `true` to allow for tree shaking.

This can improve the initial load time of your app because evaluating dependencies up front is sometimes entirely un-necessary, particularly when the dependencies have no side effects.

The value of `lazyImports` has a few possible effects:

- `null` - [@react-native/babel-preset](https://github.com/facebook/react-native/tree/main/packages/react-native-babel-preset) will handle it. (Learn more about it here: https://github.com/facebook/metro/commit/23e3503dde5f914f3e642ef214f508d0a699851d)
- `false` - No lazy initialization of any imported module.
- `true` - Lazy-init all imported modules except local imports (e.g., `./foo`), certain Expo packages that have side effects, and the two cases mentioned [here](https://babeljs.io/docs/en/babel-plugin-transform-modules-commonjs#lazy).
- `Array<string>` - [babel-plugin-transform-modules-commonjs](https://babeljs.io/docs/en/babel-plugin-transform-modules-commonjs#lazy) will handle it.
- `(string) => boolean` - [babel-plugin-transform-modules-commonjs](https://babeljs.io/docs/en/babel-plugin-transform-modules-commonjs#lazy) will handle it.

  If you choose to do this, you can also access the list of Expo packages that have side effects by using `const lazyImportsBlacklist = require('babel-preset-expo/lazy-imports-blacklist');` which returns a `Set`.

**default:** `null`

```js
[
    'babel-preset-expo',
    {
        lazyImports: true
    }
],
```

### `disableImportExportTransform`

Pass `true` to disable the transform that converts import/export to `module.exports`. Avoid setting this property directly. If you're using Metro, set `experimentalImportSupport: true` instead to ensure the entire pipeline is configured correctly.

```js
// metro.config.js

config.transformer.getTransformOptions = async () => ({
  transform: {
    // Setting this to `true` will automatically toggle `disableImportExportTransform` in `babel-preset-expo`.
    experimentalImportSupport: true,
  },
});
```

If `undefined` (default), this will be set automatically via `caller.supportsStaticESM` which is set by the bundler.

```js
[
    'babel-preset-expo',
    {
        disableImportExportTransform: true
    }
],
```

### `unstable_transformProfile`

Changes the engine preset in `@react-native/babel-preset` based on the JavaScript engine that is being targeted. In Expo SDK 50 and greater, this is automatically set based on the [`jsEngine`](https://docs.expo.dev/versions/latest/config/app/#jsengine) option in your `app.json`.

### `unstable_transformImportMeta`

Enable that transform that converts `import.meta` to `globalThis.__ExpoImportMetaRegistry`, defaults to `false` in client bundles and `true` for server bundles.

> **Note:** Use this option at your own risk. If the JavaScript engine supports `import.meta` natively, this transformation may interfere with the native implementation.

### `enableBabelRuntime`

Passed to `@react-native/babel-preset`.

### `disableFlowStripTypesTransform`

Passed to `@react-native/babel-preset`.

## Platform-specific options

All options can be passed in the platform-specific objects `native` and `web` to provide different settings on different platforms. For example, if you'd like to only apply `disableImportExportTransform` on web, use the following:

```js
[
  'babel-preset-expo',
  {
    // Default value:
    disableImportExportTransform: false,

    web: {
      // Web-specific value:
      disableImportExportTransform: true,
    },
  },
];
```

Platform-specific options have higher priority over top-level options.

### Babel Loader

The Babel loading mechanism must include the following properties on its `caller`.

#### platform

A `platform` property denoting the target platform. If the `platform` is not defined, it will default to using `web` when the `bundler` is `webpack` -- this is temporary and will throw an error in the future.

| Value     | Description             |
| --------- | ----------------------- |
| `ios`     | Runs on iOS devices     |
| `android` | Runs on Android devices |
| `web`     | Runs in web browsers    |

#### bundler

A `bundler` property denoting the name of the bundler that is being used to create the JavaScript bundle.
If the `bundler` is not defined, it will default to checking if a `babel-loader` is used, if so then `webpack` will be used, otherwise it will default to `metro`.

| Value     | Description                      |
| --------- | -------------------------------- |
| `metro`   | Bundling with [Metro][metro]     |
| `webpack` | Bundling with [Webpack][webpack] |

[metro]: https://facebook.github.io/metro/
[webpack]: https://webpack.js.org/
