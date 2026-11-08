---
"@fluentic/style": patch
---

Improve selector-sheet cascade control and important-value guidance.

- Keep `createSheet(...)` output unlayered by default so selector sheets can override unlayered third-party CSS, while allowing global `css.layer.sheet` and per-sheet `layer` opt-in through the derived `<layerNamespace>.sheet` layer.
- Add `createSheet({ layer, weight }, items)` so individual sheets can override layer participation and deliberately increase their generated anchor specificity.
- Preserve Fluentic's intended rule priority for `style.important(...)` when cascade layers reverse important declaration order.
- Add opt-in `check.important.rawValue` and `check.important.outsideSheet` compiler/runtime checks with `warn` and `error` modes.
