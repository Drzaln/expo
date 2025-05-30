import { renderHook as tlRenderHook } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { expectType } from 'tsd';

import { ExpoRoot, Slot, router } from '../exports';
import {
  useGlobalSearchParams,
  useLocalSearchParams,
  useSearchParams,
  usePathname,
  useSegments,
  useRootNavigationState,
} from '../hooks';
import Stack from '../layouts/Stack';
import Tabs from '../layouts/Tabs';
import { act, renderRouter } from '../testing-library';
import { inMemoryContext, MemoryContext } from '../testing-library/context-stubs';

/*
 * Creates an Expo Router context around the hook, where every router renders the hook
 * This allows you full navigation
 */
function renderHook<T>(
  renderCallback: () => T,
  routes: string[] = ['index'],
  { initialUrl = '/' }: { initialUrl?: string } = {}
) {
  return tlRenderHook(renderCallback, {
    wrapper: function Wrapper({ children }) {
      const context: MemoryContext = {};
      for (const key of routes) {
        context[key] = () => <>{children}</>;
      }

      return (
        <ExpoRoot
          context={inMemoryContext(context)}
          location={new URL(initialUrl, 'test://test')}
        />
      );
    },
  });
}

function renderHookOnce<T>(
  renderCallback: () => T,
  routes?: string[],
  options?: { initialUrl?: string }
) {
  return renderHook<T>(renderCallback, routes, options).result.current;
}

describe(useSegments, () => {
  it(`defaults abstract types`, () => {
    const segments = renderHookOnce(() => useSegments());
    expectType<string>(segments[0]);
    expectType<string[]>(segments);
  });
  it(`allows abstract types`, () => {
    const segments = renderHookOnce(() => useSegments<['alpha']>());
    expectType<'alpha'>(segments[0]);
  });
  it(`allows abstract union types`, () => {
    const segments = renderHookOnce(() => useSegments<['a'] | ['b'] | ['b', 'c']>());
    expectType<'a' | 'b'>(segments[0]);
    if (segments[0] === 'b') expectType<'c' | undefined>(segments[1]);
  });
});

describe(useGlobalSearchParams, () => {
  it(`return params of deeply nested routes`, () => {
    const { result } = renderHook(() => useGlobalSearchParams(), ['[fruit]/[shape]/[...veg?]'], {
      initialUrl: '/apple/square',
    });

    expect(result.current).toEqual({
      fruit: 'apple',
      shape: 'square',
    });

    act(() => router.push('/banana/circle/carrot/beetroot'));

    expect(result.current).toEqual({
      fruit: 'banana',
      shape: 'circle',
      veg: ['carrot', 'beetroot'],
    });
  });

  it(`defaults abstract types`, () => {
    const params = renderHookOnce(() => useGlobalSearchParams());
    expectType<Record<string, string | string[] | undefined>>(params);
    expectType<string | string[] | undefined>(params.a);
  });
  it(`allows abstract types`, () => {
    const params = renderHookOnce(() => useGlobalSearchParams<{ a: string }>());
    expectType<{ a?: string }>(params);
    expectType<string | undefined>(params.a);
  });

  it(`only renders once per navigation`, () => {
    const allHookValues: unknown[] = [];

    renderRouter(
      {
        '[fruit]/[shape]/[...veg?]': function Test() {
          allHookValues.push({
            url: usePathname(),
            globalParams: useGlobalSearchParams(),
            params: useLocalSearchParams(),
          });
          return null;
        },
      },
      {
        initialUrl: '/apple/square',
      }
    );

    act(() => router.push('/banana/circle/carrot/beetroot'));

    expect(allHookValues).toEqual([
      // The initial render
      {
        url: '/apple/square',
        globalParams: {
          fruit: 'apple',
          shape: 'square',
        },
        params: {
          fruit: 'apple',
          shape: 'square',
        },
      },
      // The new screen
      {
        url: '/banana/circle/carrot/beetroot',
        globalParams: {
          fruit: 'banana',
          shape: 'circle',
          veg: ['carrot', 'beetroot'],
        },
        params: {
          fruit: 'banana',
          shape: 'circle',
          veg: ['carrot', 'beetroot'],
        },
      },
    ]);
  });

  it(`causes stacks in a screen to rerender on change `, () => {
    const allHookValues: unknown[] = [];

    // When using a navigation that keeps the screens in memory (e.g. Stack)
    // , any <Screen /> that uses useGlobalSearchParams Should update
    // when the searchparams change, even if not visible
    //
    // This is different to the "only renders once per navigation" which only renders
    // the current screen

    renderRouter(
      {
        _layout: () => <Stack />,
        '[fruit]/[shape]/[...veg?]': function Test() {
          allHookValues.push({
            url: usePathname(),
            globalParams: useGlobalSearchParams(),
            params: useLocalSearchParams(),
          });
          return null;
        },
      },
      {
        initialUrl: '/apple/square',
      }
    );

    act(() => router.push('/banana/circle/carrot'));

    expect(allHookValues).toEqual([
      // The initial render
      {
        url: '/apple/square',
        globalParams: {
          fruit: 'apple',
          shape: 'square',
        },
        params: {
          fruit: 'apple',
          shape: 'square',
        },
      },
      // The new screen
      {
        url: '/banana/circle/carrot',
        globalParams: {
          fruit: 'banana',
          shape: 'circle',
          veg: ['carrot'],
        },
        params: {
          fruit: 'banana',
          shape: 'circle',
          veg: ['carrot'],
        },
      },
      // The is the first page rerendering due to being in a <Stack />
      {
        url: '/banana/circle/carrot',
        globalParams: {
          fruit: 'banana',
          shape: 'circle',
          veg: ['carrot'],
        },
        params: {
          fruit: 'apple',
          shape: 'square',
        },
      },
    ]);
  });

  it('preserves the params ', () => {
    const results1: [] = [];
    const results2: [] = [];

    renderRouter(
      {
        index: () => null,
        '[id]/_layout': () => <Slot />,
        '[id]/index': function Protected() {
          results1.push(useGlobalSearchParams());
          return null;
        },
        '[id]/[fruit]/_layout': () => <Slot />,
        '[id]/[fruit]/index': function Protected() {
          results2.push(useGlobalSearchParams());
          return null;
        },
      },
      {
        initialUrl: '/1',
      }
    );

    expect(results1).toEqual([{ id: '1' }]);
    act(() => router.push('/2'));
    expect(results1).toEqual([{ id: '1' }, { id: '2' }]);

    act(() => router.push('/3/apple'));
    // The first screen has not rerendered
    expect(results1).toEqual([{ id: '1' }, { id: '2' }]);
    expect(results2).toEqual([{ id: '3', fruit: 'apple' }]);
  });

  it(`handles encoded params`, () => {
    const { result } = renderHook(() => useGlobalSearchParams(), ['index'], {
      initialUrl: '/?test=%2Fhello%2Fworld%2F',
    });

    expect(result.current).toEqual({
      test: '/hello/world/',
    });

    act(() => router.setParams({ test: '%2Fhello%2Fworld%2Fagain' }));

    expect(result.current).toEqual({
      test: '/hello/world/again',
    });

    act(() =>
      router.push({
        pathname: '/',
        params: {
          test: '%2Ffoo%2Fbar%2F',
        },
      })
    );

    expect(result.current).toEqual({
      test: '/foo/bar/',
    });
  });
});

describe(useLocalSearchParams, () => {
  it(`return styles of deeply nested routes`, () => {
    const { result } = renderHook(() => useLocalSearchParams(), ['[fruit]/[shape]/[...veg?]'], {
      initialUrl: '/apple/square',
    });

    expect(result.current).toEqual({
      fruit: 'apple',
      shape: 'square',
    });

    act(() => router.push('/banana/circle/carrot'));

    expect(result.current).toEqual({
      fruit: 'banana',
      shape: 'circle',
      veg: ['carrot'],
    });
  });

  it('passes values down navigators', () => {
    const results1: [] = [];
    const results2: [] = [];

    renderRouter(
      {
        index: () => null,
        '[id]/_layout': () => <Slot />,
        '[id]/index': function Protected() {
          results1.push(useLocalSearchParams());
          return null;
        },
        '[id]/[fruit]/_layout': () => <Slot />,
        '[id]/[fruit]/index': function Protected() {
          results2.push(useLocalSearchParams());
          return null;
        },
      },
      {
        initialUrl: '/1',
      }
    );

    expect(results1).toEqual([{ id: '1' }]);
    act(() => router.push('/2'));
    expect(results1).toEqual([{ id: '1' }, { id: '2' }]);

    act(() => router.push('/3/apple'));
    // The first screen has not rerendered
    expect(results1).toEqual([{ id: '1' }, { id: '2' }]);
    expect(results2).toEqual([{ id: '3', fruit: 'apple' }]);
  });

  it(`defaults abstract types`, () => {
    const params = renderHookOnce(() => useLocalSearchParams());
    expectType<Record<string, string | string[] | undefined>>(params);
    expectType<string | string[] | undefined>(params.a);
  });
  it(`allows abstract types`, () => {
    const params = renderHookOnce(() => useLocalSearchParams<{ a: string }>());
    expectType<{ a?: string }>(params);
    expectType<string | undefined>(params.a);
  });

  it('does not return undefined search params', () => {
    const { result } = renderHook(() => useLocalSearchParams(), ['index'], {
      initialUrl: '/?test=1&test=2',
    });

    expect(result.current).toEqual({
      test: ['1', '2'],
    });

    act(() => router.setParams({ test: undefined }));

    expect(result.current).toEqual({});
  });

  it(`handles encoded params`, () => {
    const { result } = renderHook(() => useLocalSearchParams(), ['index'], {
      initialUrl: '/?test=%2Fhello%2Fworld%2F',
    });

    expect(result.current).toEqual({
      test: '/hello/world/',
    });

    act(() => router.setParams({ test: '%2Fhello%2Fworld%2Fagain' }));

    expect(result.current).toEqual({
      test: '/hello/world/again',
    });

    act(() =>
      router.push({
        pathname: '/',
        params: {
          test: '%2Ffoo%2Fbar%2F',
        },
      })
    );

    expect(result.current).toEqual({
      test: '/foo/bar/',
    });
  });
});

describe(usePathname, () => {
  it(`return pathname of deeply nested routes`, () => {
    const { result } = renderHook(() => usePathname(), ['[fruit]/[shape]/[...veg?]'], {
      initialUrl: '/apple/square',
    });

    expect(result.current).toEqual('/apple/square');

    act(() => router.push('/banana/circle/carrot'));
    expect(result.current).toEqual('/banana/circle/carrot');

    act(() => router.push('/banana/circle/carrot/beetroot'));
    expect(result.current).toEqual('/banana/circle/carrot/beetroot');

    act(() => router.push('/banana/circle/carrot/beetroot/beans'));
    expect(result.current).toEqual('/banana/circle/carrot/beetroot/beans');

    act(() => router.push('/banana/circle/carrot/beetroot?foo=bar'));
    expect(result.current).toEqual('/banana/circle/carrot/beetroot');
  });
});

describe(useSearchParams, () => {
  it(`return params of deeply nested routes`, () => {
    const { result } = renderHook(() => useSearchParams(), ['[fruit]/[shape]/[...veg?]'], {
      initialUrl: '/apple/square',
    });

    expect([...result.current.entries()]).toEqual([
      ['fruit', 'apple'],
      ['shape', 'square'],
    ]);

    act(() => router.push('/banana/circle/carrot'));

    expect([...result.current.entries()]).toEqual([
      ['fruit', 'banana'],
      ['shape', 'circle'],
      ['veg', 'carrot'],
    ]);
  });

  it(`has a getAll function`, () => {
    const { result } = renderHook(() => useSearchParams(), ['index'], {
      initialUrl: '/?test=1&test=2',
    });

    expect([...result.current.entries()]).toEqual([
      ['test', '1'],
      ['test', '2'],
    ]);
    expect(result.current.getAll('test')).toEqual(['1', '2']);
  });

  it(`cannot set params`, () => {
    const { result } = renderHook(() => useSearchParams(), ['index'], {
      initialUrl: '/?test=1&test=2',
    });

    expect(() => result.current.set('test', '3')).toThrow();
  });

  it('is local by default', () => {
    const results1: [] = [];
    const results2: [] = [];

    renderRouter(
      {
        index: () => null,
        '[id]/_layout': () => <Slot />,
        '[id]/index': function Protected() {
          results1.push(...useSearchParams().entries());
          return null;
        },
        '[id]/[fruit]/_layout': () => <Slot />,
        '[id]/[fruit]/index': function Protected() {
          results2.push(...useSearchParams().entries());
          return null;
        },
      },
      {
        initialUrl: '/1',
      }
    );

    expect(results1).toEqual([['id', '1']]);
    act(() => router.push('/2'));
    expect(results1).toEqual([
      ['id', '1'],
      ['id', '2'],
    ]);

    act(() => router.push('/3/apple'));
    // The first screen has not rerendered
    expect(results1).toEqual([
      ['id', '1'],
      ['id', '2'],
    ]);
    expect(results2).toEqual([
      ['id', '3'],
      ['fruit', 'apple'],
    ]);
  });

  it('cannot change between local and global between renders', () => {
    const warn = console.warn;
    console.warn = jest.fn();
    const error = console.error;
    console.error = jest.fn();

    renderRouter(
      {
        '[global]': function Index() {
          const [global, setGlobal] = React.useState(true);

          if (global) {
            setGlobal(false);
          }

          useSearchParams({ global });
          return null;
        },
      },
      {
        initialUrl: '/true',
      }
    );

    expect(console.warn).toHaveBeenCalledWith(
      "Detected change in 'global' option of useSearchParams. This value cannot change between renders"
    );

    console.error = error;
    console.warn = warn;
  });
});

describe(useRootNavigationState, () => {
  it('returns the root navigation state', () => {
    const { result } = renderHook(() => useRootNavigationState(), ['index'], {
      initialUrl: '/?test=1&test=2',
    });

    expect(result.current).toEqual({
      index: 0,
      key: expect.any(String),
      preloadedRoutes: [],
      routeNames: ['__root'],
      routes: [
        {
          key: expect.any(String),
          name: '__root',
          params: undefined,
          state: {
            routes: [
              {
                name: 'index',
                params: {
                  test: ['1', '2'],
                },
                path: '/?test=1&test=2',
              },
            ],
            stale: true,
          },
        },
      ],
      stale: false,
      type: 'stack',
    });
  });

  it('can be used within a nested route', () => {
    const fn = jest.fn();

    renderRouter({
      _layout: () => <Stack />,
      '(app)/_layout': () => <Tabs />,
      '(app)/index': function Index() {
        fn(useRootNavigationState());
        return <Text>Index</Text>;
      },
    });

    expect(fn).toHaveBeenCalledWith({
      index: 0,
      key: expect.any(String),
      preloadedRoutes: [],
      routeNames: ['__root'],
      routes: [
        {
          key: expect.any(String),
          name: '__root',
          params: undefined,
          state: {
            routes: [
              {
                name: '(app)',
                state: {
                  routes: [
                    {
                      name: 'index',
                      path: '/',
                    },
                  ],
                  stale: true,
                },
              },
            ],
            stale: true,
          },
        },
      ],
      stale: false,
      type: 'stack',
    });
  });

  it('can be used within a layout', () => {
    const fn = jest.fn();

    renderRouter({
      _layout: function Layout() {
        fn(useRootNavigationState());
        return <Stack />;
      },
      index: () => <Text>Index</Text>,
    });

    expect(fn).toHaveBeenCalledWith({
      index: 0,
      key: expect.any(String),
      preloadedRoutes: [],
      routeNames: ['__root'],
      routes: [
        {
          key: expect.any(String),
          name: '__root',
          params: undefined,
          state: {
            routes: [
              {
                name: 'index',
                path: '/',
              },
            ],
            stale: true,
          },
        },
      ],
      stale: false,
      type: 'stack',
    });
  });

  it('can be used within a nested layout', () => {
    const fn = jest.fn();

    renderRouter({
      _layout: () => <Stack />,
      '(app)/_layout': function Layout() {
        fn(useRootNavigationState());
        return <Tabs />;
      },
      '(app)/index': () => <Text>Index</Text>,
    });

    expect(fn).toHaveBeenCalledWith({
      index: 0,
      key: expect.any(String),
      preloadedRoutes: [],
      routeNames: ['__root'],
      routes: [
        {
          key: expect.any(String),
          name: '__root',
          params: undefined,
          state: {
            routes: [
              {
                name: '(app)',
                state: {
                  routes: [
                    {
                      name: 'index',
                      path: '/',
                    },
                  ],
                  stale: true,
                },
              },
            ],
            stale: true,
          },
        },
      ],
      stale: false,
      type: 'stack',
    });
  });
});
