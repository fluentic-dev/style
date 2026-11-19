---
"@fluentic/style": patch
---

Allow individual `createSheet` calls to select named cascade layers. Absolute names such as `reset` are used as written; names beginning with `.` are prefixed with `css.layerNamespace`. Preserve selector scoping and boolean options across compiler extraction, browser runtime, and server rendering. Explicit entries in `css.layers` control named layer order without duplicates at `$layer`.

Fix compiler extraction of inline curried selector calls such as `style.selector('h1')({ fontSize: '1.5rem' })`, including chained conditions. Prefer the direct second-argument form for inline styles; both forms remain supported.

Add scoped reset documentation and packed declaration consumer checks for string layer options. Use Node's URL type explicitly in Node-only test/build files to keep release validation compatible with the installed Node declarations.
