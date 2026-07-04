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

Latest report: `benchmark/main/results/bench-1783164575520.json`

Created: `2026-07-04T11:29:35.518Z`

At 1500 rows:

| Case              | Shape      | Mount median | Style update median | Remount median |
| ----------------- | ---------- | -----------: | ------------------: | -------------: |
| Fluentic direct   | DOM        |     39.64 ms |            17.74 ms |       41.86 ms |
| Fluentic scoped   | DOM        |     41.27 ms |            19.43 ms |       41.90 ms |
| Fluentic direct   | components |     40.81 ms |            17.82 ms |       42.09 ms |
| Fluentic scoped   | components |     41.42 ms |            19.51 ms |       42.75 ms |
| StyleX            | DOM        |     40.70 ms |            17.86 ms |       43.03 ms |
| StyleX            | components |     42.71 ms |            17.86 ms |       43.04 ms |
| Goober            | DOM        |     39.74 ms |            17.75 ms |       42.00 ms |
| Emotion           | DOM        |     52.23 ms |            20.75 ms |       54.10 ms |
| styled-components | DOM        |     45.37 ms |            18.14 ms |       49.23 ms |
| vanilla-extract   | DOM        |     40.06 ms |            17.80 ms |       41.99 ms |
| CSS Modules       | DOM        |     39.62 ms |            17.67 ms |       41.97 ms |

Fluentic uses extracted production output and public authoring patterns. Stable
styles, scopes, slots, and theme tokens are declared outside render. The app
suite does not use ever-changing token overrides; high-cardinality dynamic
values belong in separate diagnostics. Fluentic's cache is expected to help
repeated component instances in long-lived browser apps; see
[Style Resolution And Cache](../docs/content/src/content/docs/design/style-resolution-and-cache.mdx)
for the resolver model.

## Current SSR Style Snapshot

Latest report: `benchmark/main/results/ssr-style-1783163343300.json`

Created: `2026-07-04T11:09:03.298Z`

At 500 rows:

| Case                    | Dashboard mean | Composition mean |
| ----------------------- | -------------: | ---------------: |
| Plain React baseline    |       7.113 ms |         8.807 ms |
| Fluentic direct         |       6.896 ms |         7.652 ms |
| Fluentic scoped         |       7.246 ms |         7.838 ms |
| Fluentic token override |       7.797 ms |         8.393 ms |
| StyleX compiled         |       7.362 ms |         8.525 ms |
| Goober                  |      13.994 ms |        17.865 ms |
| styled-components       |      20.452 ms |        25.212 ms |
| Emotion                 |      33.418 ms |        38.877 ms |

SSR is warm steady-state `renderToString()` work. It also reflects the
render-time JavaScript overhead Fluentic pays in the browser after extraction:
there are no hooks, only style combine/resolve/cache work plus normal React
props.

## Current Compiler Snapshot

Latest report: `benchmark/main/results/compiler-1783164671050.json`

Created: `2026-07-04T11:31:11.047Z`

Settings: 100 files per corpus, 8 components per file, 1 warmup, 5 measured
runs, sourcemaps enabled.

| Corpus        | Babel noop | Fluentic extract warm | StyleX Babel plugin |
| ------------- | ---------: | --------------------: | ------------------: |
| unrelated-tsx |  134.26 ms |             227.59 ms |           179.56 ms |
| direct-styles |  179.93 ms |             423.02 ms |           263.95 ms |
| theme-slots   |  319.98 ms |             707.27 ms |           428.68 ms |
| stylex-styles |  227.30 ms |             448.19 ms |           468.51 ms |
| mixed-app     |  199.19 ms |             456.70 ms |           267.54 ms |

The compiler suite measures transform cost, not app runtime. Use before/after
runs on the same machine when changing extraction, evaluator, import resolution,
or sourcemap behavior. The `warm` Fluentic case means the benchmark primes and
reuses the compiler/cache directory, but it still transforms every generated
file. It is not a full incremental rebuild benchmark. In real bundler rebuilds,
unchanged modules and dependency graphs can reuse previous transformed output
and extracted CSS/cache records, so small edits should be much faster than this
full-corpus transform table suggests. Keep the compiler/build cache when
possible; clearing it is for cold measurements or stale-output debugging and
removes that reuse. Some cold per-file cases are also heavier because Fluentic
supports a broad TS/TSX authoring surface: merged chains, scopes, slot
overrides, tokens, themes, dynamic token bindings, spreads, keyframes, font
faces, at-rules, custom style functions, and css prop/runtime composition.

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
