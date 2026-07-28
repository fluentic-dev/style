---
"@fluentic/style": patch
---

Add attachable selector sheets for styling fixed third-party class names without emitting global CSS.

- Add `style.selector(...)` targets and `createSheet(...)` from `@fluentic/style/css` for manual selector rules that still attach through generated Fluentic classes.
- Support selector overrides and token overrides inside sheets so component wrappers can expose local third-party themes with the same shape as scoped style composition.
- Add `&` and `&?` selector handling for attached-element and portal-friendly selector rules. Comma-separated selector strings are rejected; pass an array when a rule should target multiple selectors.
- Add `createStyleTarget(...)` for applying style props to explicit DOM targets such as `document.body`, with shared-target reference counting for overlapping portal users.
- Make `combineStyle(...)` compose sheets directly, and add `combineStyle.with(...)` plus array-only `combineStyle.multi(...)` for cache-friendly style and sheet composition.
- Support selector sheet extraction, local token overrides, debug class names, source tracing, and sourcemap data across runtime and extracted builds.
- Keep the extracted production runtime below 5 KB minified and gzipped with `combineStyle` included, and keep selector parsing helpers out of the extracted production entry.
- Add a React Select third-party selectors example and docs for styling third-party components, selector sheets, style targets, and the new `combineStyle` helpers.
