# Fluentic Style

Runtime-first atomic CSS-in-JS for React component systems.

`@fluentic/style` gives component authors a typed styling API with stable
component slots, scoped themes, token overrides, and optional build-time
extraction. Start with runtime styles while designing components, then extract
static chains into CSS when your app or library is ready for production.

[Docs](https://fluenticstack.com/style/docs/) |
[Quick start](https://fluenticstack.com/style/docs/getting-started/quick-start/) |
[Playground](https://fluenticstack.com/style/playground/) |
[npm](https://www.npmjs.com/package/@fluentic/style)

## Why Fluentic Style

Component styling is part of your public API. Fluentic Style makes that API
explicit:

- `style(...)` creates fluent, typed style chains.
- `style.slot(...)` publishes stable component parts such as `root`, `icon`, or
  `label`.
- `style.scope(...)` composes themes, variants, state, media, and subtree
  overrides through those slots.
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

Enable the custom JSX runtime so DOM and SVG elements accept the `css` and
`scope` props.

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluentic/style"
  }
}
```

You can also use a file-level pragma:

```tsx
/** @jsxImportSource @fluentic/style */
```

## Quick Start

```tsx
/** @jsxImportSource @fluentic/style */
import { style, useCss } from '@fluentic/style';

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
  const css = useCss(styles);

  return (
    <button css={css.root} scope={css}>
      <span css={css.label}>Save</span>
    </button>
  );
}
```

Slots become the supported styling targets for a component. Scopes let you layer
themes and variants on top of those targets:

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
  const css = useCss(styles, primary);

  return (
    <button css={css.root} scope={css}>
      <span css={css.label}>Publish</span>
    </button>
  );
}
```

## Tokens and Themes

```tsx
/** @jsxImportSource @fluentic/style */
import { createTheme, createToken, style, useCss, useTheme } from '@fluentic/style';

const color = {
  accent: createToken('#2563eb', 'accent'),
  accentText: createToken('#ffffff', 'accent-text'),
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
  const css = useCss(styles);
  const themeCss = useTheme(theme);

  return <button css={[themeCss, css.button]}>Themeable</button>;
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
      jsxImportSource: '@fluentic/style',
    }),
  ],
});
```

```ts
import 'virtual:fluentic-styles';
```

The authoring model stays the same: static chains can be collected into CSS,
and dynamic styles keep the runtime path.

## Integrations

`@fluentic/style` ships one package with isolated subpath exports for runtime,
compiler, and bundler usage.

| Import | Purpose |
| --- | --- |
| `@fluentic/style` | Runtime API, style builders, selectors, hooks, tokens, themes, and types. |
| `@fluentic/style/server` | Server-safe runtime entry. |
| `@fluentic/style/jsx-runtime` | Production JSX runtime. |
| `@fluentic/style/jsx-dev-runtime` | Development JSX runtime. |
| `@fluentic/style/plugin/nextjs` | Next.js App Router integration. |
| `@fluentic/style/plugin/vite` | Vite plugin. |
| `@fluentic/style/plugin/rollup` | Rollup plugin. |
| `@fluentic/style/plugin/webpack` | Webpack plugin. |
| `@fluentic/style/plugin/rspack` | Rspack plugin. |
| `@fluentic/style/plugin/rolldown` | Rolldown plugin. |
| `@fluentic/style/plugin/esbuild` | esbuild plugin. |
| `@fluentic/style/plugin/unplugin` | Shared unplugin adapter. |
| `@fluentic/style/babel` | Babel plugin factory. |
| `@fluentic/style/compiler` | Low-level compiler API. |
| `@fluentic/style/builder/extract` | Extracted style helpers. |
| `@fluentic/style/config` | Runtime and compiler configuration helpers. |
| `@fluentic/style/runtime/rsc` | React Server Component runtime helpers. |
| `@fluentic/style/runtime/static` | Static runtime helpers for extracted output. |

See the [integration guide](https://fluenticstack.com/style/docs/integrations/overview/)
for Vite, Rollup, Rolldown, Webpack, Rspack, esbuild, Babel, and Next.js.

## Status

Fluentic Style is in beta. The intended model is stable: slots for component
parts, scopes for themes and state, tokens for overrideable design values,
runtime fallback for dynamic cases, and compiler extraction for static
production styles.
