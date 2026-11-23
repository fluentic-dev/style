# Fluentic Style Repository Guide

This file keeps repository-only details out of the public package README.

## Repository Layout

| Path                  | Purpose                                                                              |
| --------------------- | ------------------------------------------------------------------------------------ |
| `packages/style`      | The publishable `@fluentic/style` package.                                           |
| `docs/app`            | Next.js/Fumadocs static documentation app.                                           |
| `docs/content`        | MDX documentation content package.                                                   |
| `docs/basic`          | Docusaurus guided documentation app.                                                 |
| `docs/playground`     | Shared editor, compiler, examples, and preview for both docs apps.                   |
| `examples/basic`      | Basic Vite example.                                                                  |
| `examples/bundlers/*` | Minimal bundler integration examples.                                                |
| `examples/nextjs`     | Next.js App Router example for Turbopack, Webpack, SSR, SSG, RSC, and client routes. |
| `examples/snapshots`  | Snapshot fixture generation for compiler output.                                     |
| `benchmark`           | Benchmark runner and benchmark apps.                                                 |

The new guided documentation app lives in `docs/basic`. Run `pnpm --filter @docs/basic dev`
to preview it at `http://localhost:6790/style/`, or `pnpm --filter @docs/basic build`
to generate `docs/basic/build`. The existing docs app and content remain in their current locations.
Both apps serve their own `/playground/` route from the shared `@docs/playground` package;
see [the playground guide](docs/playground/README.md) for architecture and checks.
Set `ADVANCED_DOCS_URL=http://localhost:6789/style` to link the new app to a locally running
existing docs app instead of the live documentation.

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

The docs output is written to `docs/app/out`. Build and deploy the Cloudflare
Worker and static assets with `pnpm --filter @docs/app cf`.

### LLM documentation

`llms.txt` is the canonical index; `llms/` contains curated implementation and
migration guides. Keep these aligned with Learn and the public APIs, excluding
debugging workflows. Use absolute production links under
`https://fluenticstack.com/style/` so copied files remain useful.

Docs dev/build commands run `scripts/sync-llms.mjs`, which validates text-guide
links, copies the source files into public assets and generates `llms-full.txt`.
Do not edit the generated copies in `docs/app/public`. The sidebar links directly
to `/style/llms.txt` after Playground. After deployment, verify the entry URL,
complete guide and migration URLs return plain text.

The `@example/llm-basic` workspace supplies the runnable `/style/llms/example.txt`
guide. Its source/config files are copied verbatim; the generated package manifest
uses the public Fluentic version and omits repository browser-test tooling.
The normal `pnpm check` includes `llms:check`. Run `pnpm llms:check` to validate guide links/version targets, report approximate
token sizes, and typecheck/build the example. Run
`pnpm --filter @example/llm-basic test:browser` afterward for production browser
checks (installed Chrome, or `CHROME_PATH`). See the example README for fresh-agent
evaluation tasks; browser checks do not substitute for independent agent trials.

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
