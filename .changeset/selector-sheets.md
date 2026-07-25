---
"@fluentic/style": patch
---

Add selector sheets for attachable third-party styling and cache-friendly combineStyle helpers.

- Add `style.selector(...)` targets and `createSheet(...)` for attaching manual selector rules under generated Fluentic classes.
- Add `createStyleTarget(...)` for applying style props to explicit DOM targets such as portal roots.
- Add `combineStyle.with(...)` and array-only `combineStyle.multi(...)` for cache-friendly single-item and batch composition.
- Support selector sheet extraction, token overrides, debug data, and sourcemap tracing across runtime and extracted builds.
