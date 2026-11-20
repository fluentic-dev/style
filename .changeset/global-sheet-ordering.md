---
"@fluentic/style": patch
---

Add global selector sheets with immediate client injection, static extraction, and Next.js RSC development transport. Sort whole global sheets by `order` (default `0`), retaining discovery order for ties, across runtime, extracted CSS, server seeds, and client adoption.

Rename the local sheet `weight` option to `specificity`, defaulting to `1`; use `0` for a zero-specificity `:where(...)` anchor. Local sheets remain unlayered by default. `layer: true` shares ordinary style layers, absolute names stay literal, and relative names only receive an enabled main-layer prefix. The legacy `css.layer.sheet` setting no longer enables sheet layers.

Place managed important sheet declarations in a first `<resolved-layer>.important` child; `style.important(value, true)` retains native layer placement. Preserve rule ordering and debug metadata through streaming, hydration, navigation, and HMR. Update client and Next.js examples and add a dedicated ordering guide.

Support configurable runtime stylesheet documents, including disabling injection and reinserting cached styles when changing documents. Add generated bundle reports and a release gate that rejects stale measurements and documentation.
