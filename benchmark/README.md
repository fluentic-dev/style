# Fluentic Style Benchmarks

This benchmark suite separates correctness, React app performance, and build output diagnostics.

Run commands from the repository root. Reports are written to `benchmark/main/results`
by default, or to `BENCH_OUT_DIR` when that environment variable is set.

## Suites

- `pnpm bench:contract` builds every benchmark app, verifies computed styles and DOM structure, records bundle/CSS output size, then runs app timings only for apps that pass correctness.
- `pnpm bench` runs the React app timing matrix across row-count scenarios with app order rotated between repeats. Median is the primary timing metric; mean, p95, raw samples, cold first-run mount, style-tag counts, and CSS rule counts are kept for diagnosis.
- `pnpm bench:stable` uses more repeats and measured runs for reportable local numbers.
- `pnpm bench:stress` adds larger row-count scenarios so scaling issues do not hide behind a small dashboard.
- `pnpm bench:fluentic-cache` runs a browser microbenchmark for warmed runtime style/cache behavior. It compares Fluentic parent/child `useCss` cache shapes with hoisted and inline dynamic Goober, Emotion, and styled-components variants.
- `pnpm bench:dynamic-values` runs a browser microbenchmark for arbitrary values such as color, opacity, transform, and shadow width. It compares the recommended CSS-variable path across libraries against Fluentic inline dynamic style generation as the intentional cliff case.
- `pnpm bench:ssr-style` runs a Goober-style SSR render-only microbenchmark for runtime styled/object resolution work. It compares Goober, styled-components, Emotion, Fluentic dynamic runtime style creation, and Fluentic hoisted runtime style switching without server stylesheet extraction.

Fluentic is reported in separate build modes:

- `fluentic-style-extract-*` builds with the Babel/unplugin precompile path and emits `dist-extract` with a real CSS asset.
- `fluentic-runtime-css-prop` runs without the extraction plugin and exercises `useCss`, the custom JSX runtime, runtime rule insertion, and style-tag output.
- `emotion` uses Emotion's React css-prop path with hoisted object styles.

The main dashboard matrix currently includes Fluentic extracted chain/simple
modes, Fluentic runtime css-prop, Emotion, styled-components, Goober, StyleX,
vanilla-extract, CSS Modules, and the experimental Panda CSS app. Panda is
excluded unless `INCLUDE_EXPERIMENTAL=1` is set.

## Scenario Lanes

- `static-dashboard`: the current admin dashboard/table. This measures class lookup, render, remount, route switch, and known variant update work.
- `runtime-css-prop`: Fluentic runtime path using `css` props and `useCss`; this is intentionally separated from the extracted/static lane.
- `style-cache-browser`: warmed browser cache stress lane. Cross-library variants run in fresh browser contexts, initialize only the selected library family, and rotate variant order across repeats.
- `dynamic-value-browser`: arbitrary dynamic value lane. Recommended variants keep style rules static and move per-item values through CSS custom properties; inline dynamic style creation is retained as a warning/control variant.
- `ssr-style-render-only`: `renderToString` microbenchmark inspired by Goober's benchmark shape. This is for runtime CSS-in-JS render/style resolution cost, not for static CSS modules, extraction-first libraries, or server stylesheet collection APIs.
- `stress-dashboard`: the same dashboard shape at larger row counts via `pnpm bench:stress`.
- `build-output`: contract reports include build time, JS bytes, CSS bytes, file count, style tag count, and stylesheet rule count.

## Selection and Settings

- `APP=name[,name]` limits `bench` or `bench:contract` to app names such as `fluentic-style-extract-chain`, `emotion`, or package filters such as `@benchmark/app-emotion`.
- `SKIP_FLUENTIC_STYLE=1` skips Fluentic apps when comparing third-party baselines.
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
- Do not present render-only SSR microbenchmarks as full SSR CSS extraction numbers.
- Compare each library's documented best-practice path in the main app suite.
- Keep API-parity or stress cases in separate lanes when a workload is not native to every library.
- Keep extracted/static, runtime, and experimental apps labeled separately in reports.
- Treat median as the headline metric; use mean and p95 to spot outliers.
- Report raw samples and artifact metrics so regressions can be re-analyzed later.

## Future Coverage

The next useful additions are:

- `variant-toggle`: known variants for size, tone, density, and active state. Runtime libraries should use documented prop/class APIs; static libraries should use recipe/class switching.
- `wide-tree` and `deep-tree`: many sibling styled nodes and deeply nested styled nodes, matching common CSS-in-JS benchmark patterns.
- SSR style collection/extraction paths for libraries that require an explicit server sheet or extraction API.
- Chrome trace summaries for style recalculation, layout, paint, long tasks, and heap after repeated remount/update loops.
