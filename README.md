# Fluentic Style

Component style composition for React.

React styling has a lot of good answers already: CSS files, utility classes,
CSS-in-JS, compiled CSS, design tokens, and component libraries. Fluentic
explores a specific question inside that space: what if styles composed around
React components the same way props and state do?

With Fluentic, you start simple with type-safe `style(...)` and the JSX `css`
prop. When a component needs variants, themes, nested parts, or consumer
overrides, add slots, scopes, tokens, and `combineStyle(...)` so those styles
stay organized around the component.

For production builds, styles are extracted into static atomic CSS output.
Dynamic values from props and state still work as usual.

[Docs](https://fluenticstack.com/style) |
[Quick start](https://fluenticstack.com/style/docs/getting-started/quick-start/) |
[Playground](https://fluenticstack.com/style/playground/) |
[npm](https://www.npmjs.com/package/@fluentic/style)

## Install

For the beta release:

```bash
npm install @fluentic/style@beta
```

Or with pnpm:

```bash
pnpm add @fluentic/style@beta
```

Use Fluentic in a React app. Add a bundler plugin later when you want production
extraction.

## Configure Runtime JSX

Enable the runtime JSX import source so DOM and SVG elements accept the `css`
prop. This path works without a Fluentic bundler plugin.

```jsonc
/* tsconfig.json */
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluentic/style/jsx",
  },
}
```

## Why Another Style Library?

Component libraries need more than a way to attach styles to elements. They
need:

- base styles owned by the component;
- state styles for hover, focus, active, disabled, media, and container queries;
- styleable component parts for themes and composition;
- variant and theme styles that compose without relying on global CSS class names or selectors;
- predictable CSS ordering;
- dynamic values from props and state;
- static atomic CSS output for production builds.

Fluentic maps those needs to a small set of concepts:

| Concept                                                                              | What it solves                                                                               |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [`style(...)`](https://fluenticstack.com/style/docs/reference/style/)                | Type-safe style rules with fluent chains for states, selectors, media queries, and variants. |
| [`style.slot(...)`](https://fluenticstack.com/style/docs/reference/style-slot/)      | Names the styleable parts of a component.                                                    |
| [`style.scope(...)`](https://fluenticstack.com/style/docs/reference/style-scope/)    | Provides styles to those parts from variants, themes, states, or overrides.                  |
| [`combineStyle(...)`](https://fluenticstack.com/style/docs/reference/combine-style/) | Combines base styles with provided, external, and conditional styles.                        |
| [Bundler plugins](https://fluenticstack.com/style/docs/integrations/overview/)       | Extract styles into static atomic CSS output for production builds.                          |

## Start Simple

Use `style(...)` directly when simple component styling is enough.

```tsx
/* Card.tsx */
import { style } from '@fluentic/style';

const card = style({
  padding: 16,
  borderRadius: 8,
  backgroundColor: '#ffffff',
  boxShadow: '0 1px 3px rgb(15 23 42 / 0.12)',
}).hover({
  boxShadow: '0 12px 30px rgb(15 23 42 / 0.16)',
});

export function Card() {
  return <section css={card}>Ready to style.</section>;
}
```

That is the smallest version of Fluentic Style: type-safe styles, selectors, and
a `css` prop.

## Scale Into Components

When a component becomes reusable, give its styles component structure.

```tsx
/* tokens.ts */
import { createValues } from '@fluentic/style';

// App-facing values stay readable while still being themeable.
export const color = createValues(['#2563eb', '#ffffff', '#dc2626']);
export const space = createValues([8, 12, 16]);
```

<!-- dprint-ignore-start -->

```tsx
/* BaseButton.tsx */
import { style, combineStyle, bindScope, type StyleProp, type StyleTheme } from '@fluentic/style';
import { color, space } from './tokens';

export const baseButtonStyles = {
  // Slots are the component's public styling targets.
  root: style.slot({
    display: 'inline-flex',
    alignItems: 'center',
    border: 0,
    borderRadius: 8,
    cursor: 'pointer',
    gap: space(8),
    padding: space(12),
    backgroundColor: color('#2563eb'),
    color: color('#ffffff'),
  }).hover({
    opacity: 0.9,
  }).focusVisible({
    outline: '2px solid currentColor',
    outlineOffset: 2,
  }),

  icon: style.slot({
    display: 'inline-flex',
    width: space(16),
    height: space(16),
  }),

  label: style.slot({
    fontWeight: 650,
    lineHeight: 1,
  }),
};

export type BaseButtonProps = {
  children: React.ReactNode;
  css?: StyleProp;
  icon?: React.ReactNode;
  theme?: StyleTheme;
};

export function BaseButton(props: BaseButtonProps) {
  // Attach theme slot overrides to the root slot and keep the inner JSX private.
  const css = combineStyle(
    baseButtonStyles,
    bindScope(baseButtonStyles.root, props.theme),
  );

  return (
    <button css={[css.root, props.css]}>
      {props.icon ? <span css={css.icon}>{props.icon}</span> : null}
      <span css={css.label}>{props.children}</span>
    </button>
  );
}
```

<!-- dprint-ignore-end -->

```tsx
/* Button.tsx */
import { style } from '@fluentic/style';
import { BaseButton, type BaseButtonProps, baseButtonStyles } from './BaseButton';
import { color, space } from './tokens';

// Scopes target slots, so variants do not depend on internal DOM markup.
const dangerButton = style.scope([
  baseButtonStyles.root({
    backgroundColor: color('#dc2626'),
  }),
  baseButtonStyles.icon({
    color: color('#ffffff'),
  }),
  baseButtonStyles.label({
    color: color('#ffffff'),
    fontWeight: 700,
  }),
]);

export const compactButton = style.scope([
  baseButtonStyles.root({
    gap: space(8),
    padding: space(8),
  }),
  baseButtonStyles.label({
    fontSize: 13,
  }),
]);

type ButtonProps = BaseButtonProps & {
  compact?: boolean;
  danger?: boolean;
};

export function Button({ compact, danger, theme, ...props }: ButtonProps) {
  return (
    <BaseButton
      {...props}
      theme={[
        danger && dangerButton,
        compact && compactButton,
        theme,
      ]}
    />
  );
}
```

```tsx
/* App.tsx */
import { createTheme, style } from '@fluentic/style';
import { Button } from './Button';
import { color } from './tokens';

const styles = {
  root: style({
    display: 'grid',
    gap: 12,
    justifyItems: 'start',
  }),
};

// A theme maps the literal values components use to values for an app subtree.
const purpleTheme = createTheme([
  color('#2563eb', '#7c3aed'),
]);

export function App() {
  return (
    <main css={[styles.root, purpleTheme]}>
      <Button>Save changes</Button>
      <Button compact>Compact action</Button>
      <Button danger>Delete draft</Button>
    </main>
  );
}
```

`createValues(...)` is the app-facing path here: styles still show values like
`color('#2563eb')` and `space(8)`, but those values can be themed. Use named
tokens when the names themselves are part of a reusable component or design
system contract.

The important shift: consumers style the `Button` through component themes,
app-wide themes, and the `css` prop. They do not need to know whether the
component renders a `button`, `span`, SVG icon, or changes its internal markup
later.

## Debug Styles

Because Fluentic organizes styles around components, debugging stays connected
to the component too. In development, Fluentic keeps the authored context
visible: readable class names, source traces back to `style(...)`, JSX element
markers for the host element that received `css`, and priority modes that make
cascade order inspectable.

```ts
import { enableStyleDevUtils } from '@fluentic/style/dev';

enableStyleDevUtils();
```

The browser console helper appears as `StyleDevUtils`. Use it to print the
active config, switch sourcemap modes, toggle element markers, and inspect
priority with layers or sorted output.

## Add Production Extraction

Fluentic Style works without a compiler. In runtime mode, the JSX `css` prop
resolves class names and inserts atomic CSS rules as needed.

For production builds, add a bundler plugin. Styles are extracted into static
atomic CSS output. Dynamic values from props, state, or user input still work as
usual.

After adding a Fluentic bundler plugin, change the JSX import source from
`@fluentic/style/jsx` to `@fluentic/style/plugin/jsx`.

```jsonc
/* tsconfig.json */
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluentic/style/plugin/jsx",
  },
}
```

```ts
/* vite.config.ts */
import { plugin as stylePlugin } from '@fluentic/style/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    stylePlugin(),
    react({
      jsxImportSource: '@fluentic/style/plugin/jsx',
    }),
  ],
});
```

`stylePlugin(...)` accepts options for include/exclude rules, hoisting,
development sourcemaps, and extracted CSS output. See
[Plugin Options](https://fluenticstack.com/style/docs/reference/plugin-options/).

For Next.js and other bundlers, see the
[integration docs](https://fluenticstack.com/style/docs/integrations/overview/).

## Benchmarks

Benchmarks live in the repository's `benchmark/` folder and run against
production builds. Current benchmark snapshots:

React app, 1500-row dashboard:

| Case                       | Mount      | Style Update |
| -------------------------- | ---------- | ------------ |
| Fluentic direct DOM        | `40.05 ms` | `17.79 ms`   |
| Fluentic scoped DOM        | `41.43 ms` | `19.57 ms`   |
| Fluentic direct components | `41.63 ms` | `17.91 ms`   |
| Fluentic scoped components | `41.95 ms` | `19.54 ms`   |
| StyleX DOM                 | `41.28 ms` | `17.73 ms`   |
| Goober DOM                 | `40.13 ms` | `17.75 ms`   |
| Emotion DOM                | `52.63 ms` | `20.54 ms`   |
| vanilla-extract DOM        | `39.85 ms` | `17.65 ms`   |
| CSS Modules DOM            | `40.35 ms` | `17.75 ms`   |

SSR render-only, 500 rows:

| Case            | Dashboard Mean | Composition Mean |
| --------------- | -------------- | ---------------- |
| Plain React     | `6.571 ms`     | `8.348 ms`       |
| Fluentic direct | `6.601 ms`     | `7.286 ms`       |
| Fluentic scoped | `6.857 ms`     | `7.489 ms`       |
| Fluentic token  | `7.667 ms`     | `8.253 ms`       |
| StyleX          | `6.826 ms`     | `8.059 ms`       |

Compiler transform, 100 files per corpus:

| Corpus        | Fluentic Warm | StyleX Babel |
| ------------- | ------------- | ------------ |
| direct-styles | `376.43 ms`   | `249.03 ms`  |
| theme-slots   | `642.25 ms`   | `372.86 ms`  |
| stylex-styles | `392.01 ms`   | `416.69 ms`  |
| mixed-app     | `421.67 ms`   | `270.71 ms`  |

Read the [benchmark guide](./benchmark/README.md) for commands, report files,
and the public suite list.

## Package Exports

| Import                           | Purpose                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `@fluentic/style`                | Runtime API, style builders, hooks, tokens, themes, and types.                                                           |
| `@fluentic/style/css`            | CSS helper APIs for keyframes, font faces, and at-rules.                                                                 |
| `@fluentic/style/selector`       | Selector constructors, validators, presets, and priority helpers.                                                        |
| `@fluentic/style/config`         | Runtime configuration helpers.                                                                                           |
| `@fluentic/style/compiler`       | Node-only compiler entry used by build integrations and compiler benchmarks.                                             |
| `@fluentic/style/dev`            | Development utilities.                                                                                                   |
| `@fluentic/style/dev/rsc`        | React Server Component dev client boundary.                                                                              |
| `@fluentic/style/jsx`            | [JSX import source without a bundler plugin](https://fluenticstack.com/style/docs/integrations/runtime-only-mode/).      |
| `@fluentic/style/plugin/jsx`     | [JSX import source after adding a bundler plugin](https://fluenticstack.com/style/docs/integrations/jsx-runtime-setup/). |
| `@fluentic/style/plugin/nextjs`  | [Next.js App Router integration](https://fluenticstack.com/style/docs/integrations/nextjs/).                             |
| `@fluentic/style/plugin/vite`    | [Vite plugin](https://fluenticstack.com/style/docs/integrations/vite/).                                                  |
| `@fluentic/style/plugin/webpack` | [Webpack plugin](https://fluenticstack.com/style/docs/integrations/webpack/).                                            |
| `@fluentic/style/plugin/rspack`  | [Rspack plugin](https://fluenticstack.com/style/docs/integrations/rspack/).                                              |
| `@fluentic/style/plugin/farm`    | [Farm plugin](https://fluenticstack.com/style/docs/integrations/farm/).                                                  |
| `@fluentic/style/plugin/parcel`  | [Parcel plugin](https://fluenticstack.com/style/docs/integrations/parcel/).                                              |

## Repository Guide

Internal project structure, local development commands, example apps, benchmark
commands, and docs deployment notes live in the [repository guide](./DEVELOPMENT.md).

## Issues And Fixes

Fluentic Style is open to issues, bug reports, reproduction cases, and focused
fix suggestions. A broad pull-request workflow is not open yet; please start
with an issue that includes your package version, bundler/framework, a minimal
reproduction, and the expected vs actual behavior.

## Status

Fluentic Style is in beta. The core model is ready for early users: direct
styles, component slots, scoped variants, themes, tokens, dynamic values,
debugging, and static extraction. Package exports, bundler plugin behavior, and
advanced compiler features may still be refined from real project feedback.
