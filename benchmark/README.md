# Fluentic Style Benchmarks

This folder keeps the public benchmark suites for Fluentic Style. The public
surface is intentionally small:

- `pnpm bench` runs the React app browser benchmark.
- `pnpm bench:ssr-style` runs the SSR style-resolution benchmark.
- `pnpm bench:compiler` runs the compiler transform benchmark.

Run commands from the repository root. Reports are written to
`benchmark/main/results` by default, or to `BENCH_OUT_DIR` when that environment
variable is set.

## Suites

| Suite     | Command                | What it measures                                                                                                                                                                                        |
| --------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React app | `pnpm bench`           | Production browser mount/update/remount timings for the same dashboard/table app across Fluentic, StyleX, Goober, Emotion, styled-components, vanilla-extract, and CSS Modules.                         |
| SSR style | `pnpm bench:ssr-style` | `renderToString()` className/css-prop/scope/token/style-prop resolution after Fluentic and StyleX fixtures are compiled. Fluentic uses extracted CSS, so there is no server stylesheet collection step. |
| Compiler  | `pnpm bench:compiler`  | Transform time across generated source corpora, including unrelated TSX, Fluentic direct styles, theme/slot-heavy code, StyleX-shaped code, and a mixed app corpus.                                     |

## Current React App Snapshot

Latest report: `benchmark/main/results/bench-1783146037937.json`

Created: `2026-07-04T06:20:37.936Z`

At 1500 rows:

| Case              | Shape      | Mount median | Style update median | Remount median |
| ----------------- | ---------- | -----------: | ------------------: | -------------: |
| Fluentic direct   | DOM        |     40.05 ms |            17.79 ms |       42.45 ms |
| Fluentic scoped   | DOM        |     41.43 ms |            19.57 ms |       42.30 ms |
| Fluentic direct   | components |     41.63 ms |            17.91 ms |       42.71 ms |
| Fluentic scoped   | components |     41.95 ms |            19.54 ms |       43.31 ms |
| StyleX            | DOM        |     41.28 ms |            17.73 ms |       42.49 ms |
| StyleX            | components |     43.17 ms |            17.93 ms |       43.37 ms |
| Goober            | DOM        |     40.13 ms |            17.75 ms |       42.07 ms |
| Emotion           | DOM        |     52.63 ms |            20.54 ms |       53.34 ms |
| styled-components | DOM        |     45.76 ms |            18.15 ms |       48.68 ms |
| vanilla-extract   | DOM        |     39.85 ms |            17.65 ms |       41.88 ms |
| CSS Modules       | DOM        |     40.35 ms |            17.75 ms |       41.94 ms |

Fluentic uses extracted production output and public authoring patterns. Stable
styles, scopes, slots, and theme tokens are declared outside render. The app
suite does not use ever-changing token overrides; high-cardinality dynamic
values belong in separate diagnostics. Fluentic's cache is expected to help
repeated component instances in long-lived browser apps; see
[Style Resolution And Cache](../docs/content/src/content/docs/design/style-resolution-and-cache.mdx)
for the resolver model.

## Current SSR Style Snapshot

Latest report: `benchmark/main/results/ssr-style-1783146478018.json`

Created: `2026-07-04T06:27:58.016Z`

At 500 rows:

| Case                    | Dashboard mean | Composition mean |
| ----------------------- | -------------: | ---------------: |
| Plain React baseline    |       6.571 ms |         8.348 ms |
| Fluentic direct         |       6.601 ms |         7.286 ms |
| Fluentic scoped         |       6.857 ms |         7.489 ms |
| Fluentic token override |       7.667 ms |         8.253 ms |
| StyleX compiled         |       6.826 ms |         8.059 ms |
| Goober                  |      13.057 ms |        17.184 ms |
| styled-components       |      18.636 ms |        22.643 ms |
| Emotion                 |      29.273 ms |        35.878 ms |

SSR is warm steady-state `renderToString()` work. It also reflects the
render-time JavaScript overhead Fluentic pays in the browser after extraction:
there are no hooks, only style combine/resolve/cache work plus normal React
props.

## Current Compiler Snapshot

Latest report: `benchmark/main/results/compiler-1783146690445.json`

Created: `2026-07-04T06:31:30.444Z`

Settings: 100 files per corpus, 8 components per file, 1 warmup, 5 measured
runs, sourcemaps enabled.

| Corpus        | Babel noop | Fluentic extract warm | StyleX Babel plugin |
| ------------- | ---------: | --------------------: | ------------------: |
| unrelated-tsx |  124.07 ms |             224.35 ms |           179.68 ms |
| direct-styles |  177.73 ms |             376.43 ms |           249.03 ms |
| theme-slots   |  264.40 ms |             642.25 ms |           372.86 ms |
| stylex-styles |  223.99 ms |             392.01 ms |           416.69 ms |
| mixed-app     |  196.18 ms |             421.67 ms |           270.71 ms |

The compiler suite measures transform cost, not app runtime. Use before/after
runs on the same machine when changing extraction, evaluator, import resolution,
or sourcemap behavior.

## Settings

```sh
APP=fluentic-style-extract-direct-dom,stylex pnpm bench
ROWS=100,500,1500 REPEATS=5 WARMUPS=3 MEASURED=30 pnpm bench
SSR_ROWS=100,500 pnpm bench:ssr-style
FILES=200 COMPONENTS=20 pnpm bench:compiler
CHROME_BIN=/path/to/chrome pnpm bench
```

## Fairness Rules

- Use production builds and Vite preview, not dev servers.
- Keep DOM shape, text, data volume, keys, viewport, React version, and browser
  automation aligned.
- Keep static styles declared outside render wherever the library supports it.
- Compile Fluentic extracted mode and StyleX before timing their app or SSR
  fixtures.
- Keep high-cardinality dynamic values out of the main cross-library app suite.
- Separate browser app timings, SSR render-only timings, and compiler transform
  timings; they answer different questions.
- Treat median as the headline browser metric, and use mean for the SSR
  microbenchmark tables.
