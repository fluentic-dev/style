# Fluentic Style Benchmarks

This benchmark suite separates correctness, React app performance, and build output diagnostics.

Run commands from the repository root. Reports are written to `benchmark/main/results`
by default, or to `BENCH_OUT_DIR` when that environment variable is set.
Curated comparison notes are kept in [HISTORY.md](./HISTORY.md); raw JSON
reports are local artifacts and are ignored by git.

## Suites

- `pnpm bench:correctness` builds every benchmark app, verifies computed styles and DOM structure, records bundle/CSS output size, then runs app timings only for apps that pass correctness.
- `pnpm bench` runs the React app timing matrix across row-count scenarios with app order rotated between repeats. Median is the primary timing metric; mean, p95, raw samples, cold first-run mount, style-tag counts, and CSS rule counts are kept for diagnosis.
- `pnpm bench:stable` uses more repeats and measured runs for reportable local numbers.
- `pnpm bench:stress` adds larger row-count scenarios so scaling issues do not hide behind a small dashboard.
- `pnpm bench:fluentic-cache` runs a browser microbenchmark for warmed runtime style/cache behavior. It compares Fluentic parent/child `combineStyle` cache shapes, css-prop cache reuse, no-css JSX runtime overhead, and hoisted/inline dynamic Goober, Emotion, and styled-components variants.
- `pnpm bench:dynamic-values` runs a browser microbenchmark for arbitrary values such as color, opacity, transform, and shadow width. It compares the recommended CSS-variable path across libraries against Fluentic inline dynamic style generation as the intentional cliff case.
- `pnpm bench:ssr-style` compiles Fluentic source-shaped fixtures to production extracted output, then runs server-render style-resolution benchmarks for an app-shaped dashboard table and repeated component composition. It measures className, css-prop, `combineStyle()`, scope, and token override work during `renderToString()` without pretending Fluentic has a server stylesheet collection step.

Fluentic is reported in separate build modes:

- `fluentic-style-extract-direct` builds with the Babel/unplugin precompile path, emits `dist-extract` with a real CSS asset, and passes stable slots directly to the `css` prop.
- `fluentic-style-extract-scoped` uses the same extracted build with stable slots/scopes composed through `combineStyle()` and `bindScope()`.
- `fluentic-style-extract-token` uses the extracted scoped path plus a bounded set of token override values.
- Fluentic no-hoist, inline dynamic style creation, and runtime-only css-prop variants are internal diagnostic apps. They are excluded by default; select them with `APP=...` or set `INCLUDE_INTERNAL=1`.
- `emotion` uses Emotion's React css-prop path with hoisted object styles.

The main dashboard matrix currently includes Fluentic extracted direct/scoped/token
modes, Emotion, styled-components, Goober, StyleX, vanilla-extract, CSS Modules,
and the experimental Panda CSS app. Panda is excluded unless
`INCLUDE_EXPERIMENTAL=1` is set.

## Scenario Lanes

- `static-dashboard`: the current admin dashboard/table. This measures class lookup, render, remount, route switch, and known variant update work.
- `runtime-css-prop`: Fluentic runtime path using `css` props and `combineStyle`; this is an internal diagnostic lane and intentionally separated from the extracted/static lane.
- `style-cache-browser`: warmed browser cache stress lane. Cross-library variants run in fresh browser contexts, initialize only the selected library family, and rotate variant order across repeats. Fluentic-specific variants cover repeated css-prop cache hits, precomputed className output, same-map and new-map `combineStyle` paths, inline dynamic style creation, and the no-css JSX runtime fast path.
- `dynamic-value-browser`: arbitrary dynamic value lane. Recommended variants keep style rules static and move per-item values through CSS custom properties; inline dynamic style creation is retained as a warning/control variant.
- `ssr-style-render-only`: `renderToString` dashboard/table and repeated composition benchmark for server-side className, css-prop, scope, merge, and style-prop resolution. Fluentic uses extracted CSS, so this lane measures the render work that remains after extraction rather than server stylesheet collection.
- `stress-dashboard`: the same dashboard shape at larger row counts via `pnpm bench:stress`.
- `build-output`: correctness reports include build time, JS bytes, CSS bytes, file count, style tag count, and stylesheet rule count.

## Current React App Snapshot

The latest default `pnpm bench` report is
`benchmark/main/results/bench-1783124350528.json`, created
`2026-07-04T00:19:10.527Z`.

At 500 rows, the benchmark is close to the browser frame floor: Fluentic direct
css prop measured 18.18 ms mount median, scoped composition measured 18.45 ms,
token composition measured 19.63 ms, StyleX measured 18.57 ms, Emotion measured
18.94 ms, Goober measured 17.97 ms, vanilla-extract measured 18.21 ms, and CSS
Modules measured 17.46 ms.

At 1500 rows, Fluentic direct css prop measured 48.00 ms mount median and
18.67 ms style-update median. StyleX measured 45.43 ms mount and 18.39 ms
style-update. Goober measured 45.85 ms mount and 18.00 ms style-update.
Fluentic scoped composition measured 53.04 ms mount and 30.97 ms style-update;
Fluentic token composition measured 53.74 ms mount and 25.75 ms style-update.
That scoped/token update work is the next optimization target.

## Current SSR Style Snapshot

The latest default `pnpm bench:ssr-style` report is
`benchmark/main/results/ssr-style-1783120218644.json`, created
`2026-07-03T23:10:18.640Z`.

At 500 table/dashboard rows, the plain React className plus style variables
baseline rendered at 7.238 ms mean. The compiled Fluentic
direct css-prop case measured 6.510 ms mean, or 0.90x that
baseline. The compiled Fluentic scoped composition case measured 6.965 ms mean,
or 0.96x baseline. The compiled StyleX dashboard case measured
7.238 ms mean, or 1.00x baseline. The compiled Fluentic token
override case measured 7.352 ms mean, or 1.02x baseline.

At 500 composition rows, the plain React manual class/style merge baseline
rendered at 8.760 ms mean. Compiled Fluentic direct css-prop composition measured
7.026 ms mean, or 0.80x that baseline. Compiled Fluentic scoped composition
measured 7.280 ms mean, or 0.83x baseline. Compiled StyleX composition measured
8.480 ms mean, or 0.97x baseline. Compiled Fluentic scoped composition plus
per-row token overrides measured 7.925 ms mean, or 0.90x baseline.

## Selection and Settings

- `APP=name[,name]` limits `bench` or `bench:correctness` to app names such as `fluentic-style-extract-direct`, `emotion`, or package filters such as `@benchmark/app-emotion`.
- `SKIP_FLUENTIC_STYLE=1` skips Fluentic apps when comparing third-party baselines.
- `INCLUDE_INTERNAL=1` includes diagnostic apps such as Fluentic no-hoist, inline dynamic style creation, and runtime-only css-prop.
- `INCLUDE_EXPERIMENTAL=1` includes the Panda CSS benchmark app.
- `ROWS=100,500,1500`, `REPEATS=3`, `WARMUPS=3`, `MEASURED=20`, `UPDATE_STEPS=20`, and `REMOUNT_STEPS=5` override the default React app benchmark settings.
- `ITEMS=1000` controls the browser cache and dynamic-value microbenchmarks.
- `CHROME_BIN=/path/to/chrome` can point Playwright at a specific Chrome, Chromium, or Edge executable.

## Fairness Rules

- Use production builds and Vite preview, not dev servers.
- Keep DOM shape, text, data volume, keys, viewport, React version, and browser automation identical.
- Validate computed styles and DOM structure before trusting timings.
- Keep static styles declared outside render wherever the library supports it.
- Separate cold first-run metrics from post-warmup metrics; do not headline warmed `initialMountMs` as cold insertion cost.
- Rotate app/variant order between repeats when a shared browser process is used.
- For open-ended dynamic values, prefer CSS custom properties in the comparative lane so static/extracted libraries and runtime libraries are measured on their recommended survivable path.
- Do not mix `bench:ssr-style` results with dashboard app results; they measure different bottlenecks.
- Do not present render-only SSR microbenchmarks as full page delivery, stylesheet collection, or hydration numbers.
- Compare each library's documented best-practice path in the main app suite.
- Keep API-parity or stress cases in separate lanes when a workload is not native to every library.
- Keep extracted/static, runtime, and experimental apps labeled separately in reports.
- Treat median as the headline metric; use mean and p95 to spot outliers.
- Report raw samples and artifact metrics so regressions can be re-analyzed later.

## Future Coverage

The next useful additions are:

- `variant-toggle`: known variants for size, tone, density, and active state. Runtime libraries should use documented prop/class APIs; static libraries should use recipe/class switching.
- `wide-tree` and `deep-tree`: many sibling styled nodes and deeply nested styled nodes, matching common CSS-in-JS benchmark patterns.
- Explicit server stylesheet collection paths for libraries that require them, kept in a separate lane from Fluentic's extracted CSS class/style-prop resolution.
- Chrome trace summaries for style recalculation, layout, paint, long tasks, and heap after repeated remount/update loops.
