import {
  appendContentsInsideDeclarationBlock,
  appendContentsInsideGradlePluginBlock,
  findGradlePluginCodeBlock,
  findNewInstanceCodeBlock,
} from '../codeMod';

describe(findNewInstanceCodeBlock, () => {
  it('should support classic new instance - java', () => {
    const contents = 'final Foo instance = new Foo();';
    expect(findNewInstanceCodeBlock(contents, 'Foo', 'java')).toEqual({
      start: 21,
      end: 29,
      code: 'new Foo()',
    });
  });

  it('should support classic new instance - kotlin', () => {
    const contents = 'val instance = Foo()';
    expect(findNewInstanceCodeBlock(contents, 'Foo', 'kt')).toEqual({
      start: 15,
      end: 19,
      code: 'Foo()',
    });
  });

  it('should support anonymous class new instance - java', () => {
    const contents = [
      'final Runnable runnable = new Runnable() {',
      '  @Override',
      '  public void run() {',
      '    Log.i(TAG, "runnable");',
      '  }',
      '};',
    ].join('\n');
    expect(findNewInstanceCodeBlock(contents, 'Runnable', 'java')).toEqual({
      start: 26,
      end: 109,
      code: [
        'new Runnable() {',
        '  @Override',
        '  public void run() {',
        '    Log.i(TAG, "runnable");',
        '  }',
        '}',
      ].join('\n'),
    });
  });

  it('should support anonymous class new instance - kotlin', () => {
    const contents = [
      'val runnable = object : Runnable() {',
      '  override fun run() {',
      '    Log.i(TAG, "runnable")',
      '  }',
      '}',
    ].join('\n');
    expect(findNewInstanceCodeBlock(contents, 'Runnable', 'kt')).toEqual({
      start: 15,
      end: 91,
      code: [
        'object : Runnable() {',
        '  override fun run() {',
        '    Log.i(TAG, "runnable")',
        '  }',
        '}',
      ].join('\n'),
    });
  });

  it('should return null if not found', () => {
    const contents = 'final Foo instance = new Foo();';
    expect(findNewInstanceCodeBlock(contents, 'Bar', 'java')).toBe(null);
  });
});

describe(appendContentsInsideDeclarationBlock, () => {
  it('should support class declaration', () => {
    const contents = `
public class App {
  public static void main(String[] args) {
    System.out.println("Hello App!");
  }
}`;

    const expectContents = `
public class App {
  public static void main(String[] args) {
    System.out.println("Hello App!");
  }

  public void foo() {
    System.out.println("Hello foo!");
  }
}`;

    expect(
      appendContentsInsideDeclarationBlock(
        contents,
        'public class App',
        `
  public void foo() {
    System.out.println("Hello foo!");
  }\n`
      )
    ).toEqual(expectContents);
  });

  it('should support method declaration', () => {
    const contents = `
public class App {
  public static void main(String[] args) {
    System.out.println("Hello App!");
  }
}`;

    const expectContents = `
public class App {
  public static void main(String[] args) {
    System.out.println("Hello App!");
    System.out.println("Hello from generated code.");
  }
}`;

    expect(
      appendContentsInsideDeclarationBlock(
        contents,
        'public static void main',
        '  System.out.println("Hello from generated code.");\n  '
      )
    ).toEqual(expectContents);
  });
});

describe(findGradlePluginCodeBlock, () => {
  it('should find plugins block', () => {
    const contents = `
plugins {
  id("com.android.application")
}
`;

    expect(findGradlePluginCodeBlock(contents, 'plugins')).toEqual({
      start: 9,
      end: 43,
      code: `\
{
  id("com.android.application")
}`,
    });
  });
});

describe(appendContentsInsideGradlePluginBlock, () => {
  it('should append contents to the end of Gradle plugin block', () => {
    const contents = `plugins { id("com.android.application") }`;
    expect(
      appendContentsInsideGradlePluginBlock(contents, 'plugins', '  id("dev.expo.example.plugins")')
    ).toMatchInlineSnapshot(
      `"plugins { id("com.android.application")   id("dev.expo.example.plugins")}"`
    );
  });

  it('should append contents to the end of Gradle multiline pluginManagement block', () => {
    const contents = `
pluginManagement {
  includeBuild("packages/gradle-plugin/")
}
`;
    expect(
      appendContentsInsideGradlePluginBlock(
        contents,
        'pluginManagement',
        '  includeBuild("packages/gradle-plugin-expo/")'
      )
    ).toMatchInlineSnapshot(`
      "
      pluginManagement {
        includeBuild("packages/gradle-plugin/")
        includeBuild("packages/gradle-plugin-expo/")}
      "
    `);
  });

  it('should throw if plugin block is not found', () => {
    const contents = 'dummy';
    expect(() =>
      appendContentsInsideGradlePluginBlock(contents, 'plugins', '  id("test")')
    ).toThrow();
  });
});
