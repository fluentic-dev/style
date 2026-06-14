# Fluentic Style

Runtime-first atomic CSS-in-JS for React component systems.

`@fluentic/style` gives you a fluent TypeScript styling API, stable component
slots, composable themes, and optional build-time extraction. It is built for
teams that want CSS-in-JS ergonomics without making runtime style generation the
only path.

## Why this exists

Component libraries need more than a way to assign class names. They need:

- base styles owned by the component;
- state styles for hover, focus, active, disabled, media, and container queries;
- public override points for component parts;
- themes that compose without global class contracts;
- predictable CSS ordering;
- an escape hatch for dynamic values;
- a production path that can precompile static styles.

Fluentic Style models those needs directly:

| Concept             | What it solves                                                   |
| ------------------- | ---------------------------------------------------------------- |
| `style(...)`        | Standalone fluent style chains.                                  |
| `style.slot(...)`   | Public component parts that can be themed and overridden.        |
| `style.scope(...)`  | Bundles of slot overrides for themes, state, and media queries.  |
| `combineStyle(...)` | Resolve styles with scopes, slot overrides, and token overrides. |
| Bundler plugins     | Optional static extraction into atomic CSS.                      |

## Install

```bash
pnpm add @fluentic/style
```

React 18+ is expected.

## Quick start

Configure the custom JSX runtime:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluentic/style"
  }
}
```

Create styles and render them:

```tsx
/** @jsxImportSource @fluentic/style */
import { style } from '@fluentic/style';

const styles = {
  root: style.slot({
    display: 'inline-flex',
    alignItems: 'center',
    border: 0,
    borderRadius: 6,
    cursor: 'pointer',
    padding: '8px 12px',
    backgroundColor: '#111',
    color: '#fff',
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

Add a theme as a scope:

```tsx
const primaryButton = style.scope([
  styles.root({
    backgroundColor: 'royalblue',
    color: 'white',
  }),
  styles.label({
    fontWeight: 700,
  }),
]);
```

## Vite setup

```ts
import { DefaultPrioritySelectors } from '@fluentic/style';
import { plugin as stylePlugin } from '@fluentic/style/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    stylePlugin({
      selectors: DefaultPrioritySelectors,
    }),
    react({
      jsxImportSource: '@fluentic/style',
    }),
  ],
});
```

Import the virtual runtime module once in your app entry:

```ts
import 'virtual:fluentic-style';
```

## Package exports

| Import                            | Purpose                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `@fluentic/style`                 | Runtime API, default `style`, selectors, sheet utilities, React hooks and types. |
| `@fluentic/style/server`          | Server-safe runtime entry.                                                       |
| `@fluentic/style/jsx/runtime`     | Production JSX runtime.                                                          |
| `@fluentic/style/jsx/dev-runtime` | Development JSX runtime.                                                         |
| `@fluentic/style/precompile`      | Precompiled style helpers.                                                       |
| `@fluentic/style/config`          | Runtime and compiler configuration helpers.                                      |
| `@fluentic/style/runtime/rsc`     | React Server Component runtime helpers.                                          |
| `@fluentic/style/runtime/style`   | Style runtime helpers for extracted output.                                      |
| `@fluentic/style/plugin/vite`     | Vite plugin.                                                                     |
| `@fluentic/style/plugin/rollup`   | Rollup plugin.                                                                   |
| `@fluentic/style/plugin/webpack`  | Webpack plugin.                                                                  |
| `@fluentic/style/plugin/rspack`   | Rspack plugin.                                                                   |
| `@fluentic/style/plugin/rolldown` | Rolldown plugin.                                                                 |
| `@fluentic/style/plugin/esbuild`  | esbuild plugin.                                                                  |
| `@fluentic/style/plugin/nextjs`   | Next.js App Router integration.                                                  |
| `@fluentic/style/plugin/unplugin` | Shared unplugin adapter.                                                         |
| `@fluentic/style/babel`           | Babel plugin factory.                                                            |
| `@fluentic/style/compiler`        | Low-level compiler API.                                                          |

## Runtime and extraction

Fluentic Style can run without a compiler. In runtime-only mode, the JSX `css`
prop and `combineStyle` resolve class names and insert any atomic rules that
were not extracted ahead of time.

For production applications, use a bundler plugin. Static style chains can be
transformed and collected into CSS while dynamic cases keep the runtime fallback.
The authoring model stays the same.

## Repository layout

| Path                  | Purpose                                                                              |
| --------------------- | ------------------------------------------------------------------------------------ |
| `packages/style`      | The publishable `@fluentic/style` package.                                           |
| `docs/app`            | Astro Starlight static documentation app.                                            |
| `docs/content`        | MDX documentation content package, including the browser playground.                 |
| `examples/basic`      | Basic Vite example.                                                                  |
| `examples/bundlers/*` | Minimal bundler integration examples.                                                |
| `examples/nextjs`     | Next.js App Router example for Turbopack, Webpack, SSR, SSG, RSC, and client routes. |
| `examples/snapshots`  | Snapshot fixture generation for compiler output.                                     |
| `benchmark`           | Benchmark runner and benchmark apps.                                                 |

## Development

Install dependencies:

```bash
pnpm install
```

Build the library:

```bash
pnpm --filter @fluentic/style build
```

Run tests:

```bash
pnpm test
```

Run the docs:

```bash
pnpm --filter @docs/app dev
```

Run the Next.js example:

```bash
pnpm --filter @fluentic/style build
pnpm --filter @example/nextjs dev
```

Run the benchmark contract suite:

```bash
pnpm bench:contract
```

Build the static docs site:

```bash
pnpm --filter @docs/app build
```

The docs output is written to `docs/app/dist` and can be deployed to Cloudflare
Pages as a static site.

## Cloudflare Pages docs deploy

Use these settings:

```txt
Project root: docs/app
Build command: pnpm build
Output directory: dist
Framework preset: Astro
```

## Status

The package is in active beta. The core model is stable: slots for component
parts, scopes for themes and state, explicit style composition, runtime fallback
for dynamic cases, and compiler extraction for static production styles.
