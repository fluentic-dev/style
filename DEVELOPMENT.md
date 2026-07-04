# Fluentic Style Repository Guide

This file keeps repository-only details out of the public package README.

## Repository Layout

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

## Local Development

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

Run type checks:

```bash
pnpm typecheck
```

Check formatting:

```bash
pnpm format:check
```

Run the docs app:

```bash
pnpm --filter @docs/app dev
```

Run the Next.js example:

```bash
pnpm --filter @fluentic/style build
pnpm --filter @example/nextjs dev
```

Build the static docs site:

```bash
pnpm --filter @docs/app build
```

The docs output is written to `docs/app/dist` and can be deployed to Cloudflare
Pages as a static site.

## Benchmark Commands

The benchmark suite lives in [`benchmark`](./benchmark/README.md). Run commands
from the repository root.

Run the correctness contract first:

```bash
pnpm bench:correctness
```

Run the default React app performance matrix:

```bash
pnpm bench
```

Run a more stable local report:

```bash
pnpm bench:stable
```

Run larger row-count scenarios:

```bash
pnpm bench:stress
```

Run Fluentic cache and dynamic-value browser lanes:

```bash
pnpm bench:fluentic-cache
pnpm bench:dynamic-values
```

Run SSR render-only style resolution benchmarks:

```bash
pnpm bench:ssr-style
```

Limit a benchmark to one or more apps:

```bash
APP=fluentic-style-extract-direct,emotion pnpm bench
```

Include internal diagnostic lanes:

```bash
INCLUDE_INTERNAL=1 pnpm bench
```

Benchmark reports are written to `benchmark/main/results` by default, or to
`BENCH_OUT_DIR` when that environment variable is set.
