# Benchmark History

This file keeps curated benchmark summaries for optimization work. Raw JSON
reports stay in `benchmark/main/results` and are ignored by git; copy the
important result table here when a benchmark is used to justify or compare a
runtime change.

For each entry, include:

- the date and short change description
- the command and key settings
- the report file name, if kept locally
- browser, Node, and commit/context
- median and p95 numbers for the variants that matter

Treat these numbers as local regression references, not universal claims. Small
browser timings move with machine load, browser version, and thermal state; use
the raw samples in the JSON when a result looks suspicious.

## 2026-06-13 Runtime Cache And JSX Fast Path

Context:

- Runtime css prop/cache/core refactor.
- Css prop path cache now reuses final resolved data.
- RSC dev payload generation reuses resolved css prop items.
- JSX runtime now preserves props identity when no `css` prop exists.
- Cache benchmark app updated to use public `getClassName` and current
  `style[data-css-sheet]` telemetry.
- Working tree contained the active runtime refactor; base commit was `0878167`.

Command:

```sh
VARIANTS=parentHoisted,parentHoistedClassName,childHoistedSameMap,childNewMapSameSlots,fluenticNoCssCreateElement,reactNoCssCreateElement \
REPEATS=3 ITEMS=1000 WARMUPS=3 MEASURED=20 UPDATE_STEPS=20 \
pnpm --filter @benchmark/main bench:fluentic-cache
```

Environment:

- Report: raw JSON pruned during result cleanup; summary kept here.
- Created: `2026-06-13T14:49:08.688Z`
- Browser: Chrome `149.0.7827.114`
- Node: `v22.22.3`

Results:

| Variant                      | Mount Median | Update Median | Mount P95 | Update P95 | Rules | Style Tags | Fluentic Tags |
| ---------------------------- | -----------: | ------------: | --------: | ---------: | ----: | ---------: | ------------: |
| `parentHoisted`              |      15.90ms |       17.07ms |   16.15ms |    17.08ms |    20 |          3 |             2 |
| `parentHoistedClassName`     |      17.10ms |       17.04ms |   17.25ms |    17.07ms |    20 |          3 |             2 |
| `childHoistedSameMap`        |      15.90ms |       17.07ms |   15.95ms |    17.08ms |    20 |          3 |             2 |
| `childNewMapSameSlots`       |      17.90ms |       17.02ms |   18.15ms |    17.36ms |    20 |          3 |             2 |
| `fluenticNoCssCreateElement` |      16.30ms |       17.05ms |   16.60ms |    17.07ms |     4 |          1 |             0 |
| `reactNoCssCreateElement`    |      16.30ms |       17.06ms |   16.70ms |    17.07ms |     4 |          1 |             0 |

Notes:

- The no-css Fluentic createElement path is effectively equal to direct React
  createElement in this harness.
- Update timings are close to the two-frame measurement floor, so mount medians
  are the more useful comparison signal for this focused run.
- `parentHoisted`, `childHoistedSameMap`, and `parentHoistedClassName` are all
  in a narrow warmed-cache band. `childNewMapSameSlots` remains slightly higher
  on mount because it creates a new wrapper object per child.
