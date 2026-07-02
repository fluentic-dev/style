# Fluentic Style

Runtime-first atomic CSS-in-JS for React component systems.

`@fluentic/style` gives component authors a typed styling API with stable
component slots, scoped themes, token overrides, and optional build-time
extraction. Start with runtime styles while designing components, then extract
static chains into CSS when your app or library is ready for production.

[Docs](https://fluenticstack.com/style) |
[Quick start](https://fluenticstack.com/style/docs/getting-started/quick-start/) |
[Playground](https://fluenticstack.com/style/playground/) |
[GitHub](https://github.com/fluentic-dev/style) |
[npm](https://www.npmjs.com/package/@fluentic/style)

## Why Fluentic Style

Component styling is part of your public API. Fluentic Style makes that API
explicit:

- `style(...)` creates fluent, typed style chains.
- `style.slot(...)` publishes stable component parts such as `root`, `icon`, or
  `label`.
- `style.scope(...)` groups themes, variants, state, and media rules around
  those slots.
- `combineStyle(...)` resolves a component's styles with the scopes and
  overrides it receives.
- `createToken(...)` and `createTheme(...)` keep design values overrideable
  without rewriting component styles.
- Bundler plugins can extract static styles into predictable atomic CSS while
  dynamic cases keep the runtime fallback.

## Install

For the beta release:

```bash
pnpm add @fluentic/style@beta
```

Or with npm:

```bash
npm install @fluentic/style@beta
```

React 18 or newer is a peer dependency. Bundler integrations are optional peer
dependencies, so you only install the tools your app already uses.

## Configure JSX

Enable the custom JSX runtime so DOM and SVG elements accept the `css` prop.

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluentic/style/plugin/jsx"
  }
}
```

## Quick Start

```tsx
import { combineStyle, style } from '@fluentic/style';

const styles = {
  root: style.slot({
    display: 'inline-flex',
    alignItems: 'center',
    border: 0,
    borderRadius: 8,
    cursor: 'pointer',
    padding: '8px 12px',
    backgroundColor: '#111827',
    color: '#ffffff',
  }).hover({
    opacity: 0.88,
  }),
  label: style.slot({
    fontWeight: 650,
  }),
};

export function Button() {
  return (
    <button css={styles.root}>
      <span css={styles.label}>Save</span>
    </button>
  );
}
```

Slots become the supported styling targets for a component. Scopes let themes
and variants address those targets without relying on generated class names:

```tsx
const primary = style.scope([
  styles.root({
    backgroundColor: '#2563eb',
    color: '#ffffff',
  }),
  styles.label({
    fontWeight: 760,
  }),
]);

export function PrimaryButton() {
  const css = combineStyle(styles, primary);

  return (
    <button css={css.root}>
      <span css={css.label}>Publish</span>
    </button>
  );
}
```

## Tokens and Themes

```tsx
import { combineStyle, createTheme, createToken, style } from '@fluentic/style';

const color = {
  accent: createToken('#2563eb'),
  accentText: createToken('#ffffff'),
};

const theme = createTheme([
  color.accent('#7c3aed'),
  color.accentText('#ffffff'),
]);

const styles = {
  button: style({
    backgroundColor: color.accent,
    color: color.accentText,
    borderRadius: 8,
    padding: '8px 12px',
  }),
};

export function ThemedButton() {
  const css = combineStyle(styles);

  return <button css={[theme, css.button]}>Themeable</button>;
}
```

## Add Static Extraction With Vite

Runtime-only mode works without a compiler. For production apps, add a bundler
plugin and import the virtual runtime module once near your app entry.

```ts
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

```ts
import 'virtual:fluentic-style';
```

The authoring model stays the same: static chains are collected into CSS, and
dynamic styles keep the runtime path.

## Integrations

`@fluentic/style` ships one package with isolated subpath exports for app,
JSX, and bundler usage.

| Import                           | Purpose                                                           |
| -------------------------------- | ----------------------------------------------------------------- |
| `@fluentic/style`                | Runtime API, style builders, hooks, tokens, themes, and types.    |
| `@fluentic/style/css`            | CSS helper APIs for keyframes, font faces, and at-rules.          |
| `@fluentic/style/selector`       | Selector constructors, validators, presets, and priority helpers. |
| `@fluentic/style/config`         | Runtime configuration helpers.                                    |
| `@fluentic/style/dev`            | Development utilities.                                            |
| `@fluentic/style/dev/rsc`        | React Server Component dev client boundary.                       |
| `@fluentic/style/jsx`            | JSX import source for runtime-only apps.                          |
| `@fluentic/style/plugin/jsx`     | JSX import source for plugin-managed builds.                      |
| `@fluentic/style/plugin/nextjs`  | Next.js App Router integration.                                   |
| `@fluentic/style/plugin/vite`    | Vite plugin.                                                      |
| `@fluentic/style/plugin/webpack` | Webpack plugin.                                                   |
| `@fluentic/style/plugin/rspack`  | Rspack plugin.                                                    |
| `@fluentic/style/plugin/farm`    | Farm plugin.                                                      |

See the [integration guide](https://fluenticstack.com/style/docs/integrations/overview/)
for Vite, Webpack, Rspack, Farm, and Next.js.

## Status

Fluentic Style is in beta. The core model is stable: slots for component parts,
scopes for themes and state, explicit style composition, tokens for overrideable
design values, runtime fallback for dynamic cases, and compiler extraction for
static production styles.
