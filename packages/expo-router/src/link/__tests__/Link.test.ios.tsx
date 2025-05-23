import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Platform, Text, View } from 'react-native';

import { router } from '../../imperative-api';
import Stack from '../../layouts/Stack';
import { renderRouter, screen } from '../../testing-library';
import { Pressable } from '../../views/Pressable';
import { Link } from '../Link';

// Render and observe the props of the Link component.

it('renders a Link', () => {
  const { getByText } = render(<Link href="/foo">Foo</Link>);
  const node = getByText('Foo');
  expect(node).toBeDefined();
  expect(node.props.href).toBe('/foo');
  expect(node.props).toEqual({
    children: 'Foo',
    href: '/foo',
    onPress: expect.any(Function),
    role: 'link',
  });
});

it('renders a Link with React Native array style prop when using asChild', () => {
  const { getByTestId } = render(
    <Link asChild testID="link" href="/foo" style={[{ color: 'red' }, { backgroundColor: 'blue' }]}>
      <Pressable>
        <Text>Foo</Text>
      </Pressable>
    </Link>
  );
  const node = getByTestId('link');
  expect(node).toBeDefined();
  expect(node.props.style).toStrictEqual({
    color: 'red',
    backgroundColor: 'blue',
  });
});

xit('renders a Link with a slot', () => {
  const { getByText, getByTestId } = render(
    <Link asChild href="/foo">
      <View testID="pressable">
        <Text testID="inner-text">Button</Text>
      </View>
    </Link>
  );
  const node = getByText('Button');
  expect(node.props).toEqual({
    children: 'Button',
    testID: 'inner-text',
  });

  const pressable = getByTestId('pressable');
  if (Platform.OS === 'web') {
    expect(pressable.props).toEqual(
      expect.objectContaining({
        children: expect.anything(),
        href: '/foo',
        role: 'link',
        testID: 'pressable',
        onClick: expect.any(Function),
      })
    );
  } else {
    expect(pressable.props).toEqual(
      expect.objectContaining({
        children: expect.anything(),
        href: '/foo',
        role: 'link',
        testID: 'pressable',
        onPress: expect.any(Function),
      })
    );
  }
});

it('ignores className on native', () => {
  const { getByTestId } = render(
    <Link href="/foo" testID="link" style={{ color: 'red' }} className="xxx">
      Hello
    </Link>
  );
  const node = getByTestId('link');
  expect(node.props).toEqual(
    expect.objectContaining({
      children: 'Hello',
      className: 'xxx',
      href: '/foo',
      role: 'link',
      style: { color: 'red' },
      testID: 'link',
      onPress: expect.any(Function),
    })
  );
});

it('ignores className with slot on native', () => {
  const { getByTestId } = render(
    <Link asChild href="/foo" testID="link" style={{ color: 'red' }} className="xxx">
      <View />
    </Link>
  );
  const node = getByTestId('link');
  expect(node.props).toEqual(
    expect.objectContaining({
      children: undefined,
      className: 'xxx',
      href: '/foo',
      role: 'link',
      style: { color: 'red' },
      testID: 'link',
      onPress: expect.any(Function),
    })
  );
});
it('strips web-only href attributes', () => {
  const { getByTestId } = render(
    <Link
      href="/foo"
      testID="link"
      style={{ color: 'red' }}
      download="file.png"
      rel="noopener"
      target="_blank">
      Link
    </Link>
  );
  const node = getByTestId('link');
  expect(node.props).toEqual(
    expect.objectContaining({
      children: 'Link',
      href: '/foo',
      role: 'link',
      style: { color: 'red' },
      testID: 'link',
      onPress: expect.any(Function),
    })
  );
});

it('can preserve the initialRoute', () => {
  renderRouter({
    index: function MyIndexRoute() {
      return (
        <Link testID="link" withAnchor href="/fruit/banana">
          Press me
        </Link>
      );
    },
    '/fruit/_layout': {
      unstable_settings: {
        anchor: 'apple',
      },
      default: () => {
        return <Stack />;
      },
    },
    '/fruit/apple': () => <Text testID="apple">Apple</Text>,
    '/fruit/banana': () => <Text testID="banana">Banana</Text>,
  });

  act(() => fireEvent.press(screen.getByTestId('link')));
  expect(screen.getByTestId('banana')).toBeDefined();
  act(() => router.back());
  expect(screen.getByTestId('apple')).toBeDefined();
  act(() => router.back());
  expect(screen.getByTestId('link')).toBeDefined();
});

it('can preserve the initialRoute with shared groups', () => {
  renderRouter({
    index: function MyIndexRoute() {
      return (
        <Link testID="link" withAnchor href="/(foo)/fruit/banana">
          Press me
        </Link>
      );
    },
    '/(foo,bar)/fruit/_layout': {
      unstable_settings: {
        anchor: 'apple',
        foo: {
          anchor: 'orange',
        },
      },
      default: () => {
        return <Stack />;
      },
    },
    '/(foo,bar)/fruit/apple': () => <Text testID="apple">Apple</Text>,
    '/(foo,bar)/fruit/orange': () => <Text testID="orange">Orange</Text>,
    '/(foo,bar)/fruit/banana': () => <Text testID="banana">Banana</Text>,
  });

  act(() => fireEvent.press(screen.getByTestId('link')));
  expect(screen.getByTestId('banana')).toBeDefined();
  act(() => router.back());
  expect(screen.getByTestId('orange')).toBeDefined();
  act(() => router.back());
  expect(screen.getByTestId('link')).toBeDefined();
});

describe('singular', () => {
  test('can dynamically route using singular', () => {
    renderRouter(
      {
        '[slug]': () => (
          <Link testID="link" href="/apple" dangerouslySingular>
            Slug
          </Link>
        ),
      },
      {
        initialUrl: '/apple',
      }
    );

    act(() => router.push('/apple'));
    act(() => router.push('/apple'));
    act(() => router.push('/banana'));

    expect(screen).toHaveRouterState({
      index: 0,
      key: expect.any(String),
      preloadedRoutes: [],
      routeNames: ['__root'],
      routes: [
        {
          key: expect.any(String),
          name: '__root',
          params: {
            slug: 'apple',
          },
          state: {
            index: 3,
            key: expect.any(String),
            preloadedRoutes: [],
            routeNames: ['_sitemap', '[slug]', '+not-found'],
            routes: [
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: '/apple',
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: undefined,
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: undefined,
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'banana',
                },
                path: undefined,
              },
            ],
            stale: false,
            type: 'stack',
          },
        },
      ],
      stale: false,
      type: 'stack',
    });

    // Should push /apple and remove all previous instances of /apple
    act(() => fireEvent.press(screen.getByTestId('link')));

    expect(screen).toHaveRouterState({
      index: 0,
      key: expect.any(String),
      preloadedRoutes: [],
      routeNames: ['__root'],
      routes: [
        {
          key: expect.any(String),
          name: '__root',
          params: {
            slug: 'apple',
          },
          state: {
            index: 1,
            key: expect.any(String),
            preloadedRoutes: [],
            routeNames: ['_sitemap', '[slug]', '+not-found'],
            routes: [
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'banana',
                },
                path: undefined,
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: undefined,
              },
            ],
            stale: false,
            type: 'stack',
          },
        },
      ],
      stale: false,
      type: 'stack',
    });
  });
});

test('can dynamically route using singular function', () => {
  renderRouter(
    {
      '[slug]': () => (
        <Link
          testID="link"
          href="/apple?id=1"
          dangerouslySingular={(_, params) => params.id?.toString()}>
          Slug
        </Link>
      ),
    },
    {
      initialUrl: '/apple',
    }
  );

  act(() => router.push('/apple?id=1'));
  act(() => router.push('/apple?id=1'));
  act(() => router.push('/apple?id=2'));
  act(() => router.push('/banana'));

  expect(screen).toHaveRouterState({
    index: 0,
    key: expect.any(String),
    preloadedRoutes: [],
    routeNames: ['__root'],
    routes: [
      {
        key: expect.any(String),
        name: '__root',
        params: {
          slug: 'apple',
        },
        state: {
          index: 4,
          key: expect.any(String),
          preloadedRoutes: [],
          routeNames: ['_sitemap', '[slug]', '+not-found'],
          routes: [
            {
              key: expect.any(String),
              name: '[slug]',
              params: {
                slug: 'apple',
              },
              path: '/apple',
            },
            {
              key: expect.any(String),
              name: '[slug]',
              params: {
                id: '1',
                slug: 'apple',
              },
              path: undefined,
            },
            {
              key: expect.any(String),
              name: '[slug]',
              params: {
                id: '1',
                slug: 'apple',
              },
              path: undefined,
            },
            {
              key: expect.any(String),
              name: '[slug]',
              params: {
                id: '2',
                slug: 'apple',
              },
              path: undefined,
            },
            {
              key: expect.any(String),
              name: '[slug]',
              params: {
                slug: 'banana',
              },
              path: undefined,
            },
          ],
          stale: false,
          type: 'stack',
        },
      },
    ],
    stale: false,
    type: 'stack',
  });

  // Should push /apple and remove all previous instances of /apple
  act(() => fireEvent.press(screen.getByTestId('link')));

  expect(screen).toHaveRouterState({
    index: 0,
    key: expect.any(String),
    preloadedRoutes: [],
    routeNames: ['__root'],
    routes: [
      {
        key: expect.any(String),
        name: '__root',
        params: {
          slug: 'apple',
        },
        state: {
          index: 3,
          key: expect.any(String),
          preloadedRoutes: [],
          routeNames: ['_sitemap', '[slug]', '+not-found'],
          routes: [
            {
              key: expect.any(String),
              name: '[slug]',
              params: {
                slug: 'apple',
              },
              path: '/apple',
            },
            {
              key: expect.any(String),
              name: '[slug]',
              params: {
                id: '2',
                slug: 'apple',
              },
              path: undefined,
            },
            {
              key: expect.any(String),
              name: '[slug]',
              params: {
                slug: 'banana',
              },
              path: undefined,
            },
            {
              key: expect.any(String),
              name: '[slug]',
              params: {
                id: '1',
                slug: 'apple',
              },
              path: undefined,
            },
          ],
          stale: false,
          type: 'stack',
        },
      },
    ],
    stale: false,
    type: 'stack',
  });
});

describe('prefetch', () => {
  it('can preload the href', () => {
    renderRouter({
      index: () => {
        return <Link prefetch href="/test" />;
      },
      test: () => null,
    });

    expect(screen).toHaveRouterState({
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
            index: 0,
            key: expect.any(String),
            preloadedRoutes: [
              {
                key: expect.any(String),
                name: 'test',
                params: {},
              },
            ],
            routeNames: ['index', 'test', '_sitemap', '+not-found'],
            routes: [
              {
                key: expect.any(String),
                name: 'index',
                params: undefined,
                path: '/',
              },
            ],
            stale: false,
            type: 'stack',
          },
        },
      ],
      stale: false,
      type: 'stack',
    });
  });
});
