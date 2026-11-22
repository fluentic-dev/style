---
"@fluentic/style": patch
---

Keep development priority-group style tags and insertion caches when lower-priority rules arrive after selector or global sheets. Isolate priority tag pools in layer mode, cache sort-group lookups and layer-order metadata, and update each touched sourcemap once per flush instead of rebuilding previously inserted rules.

Export `CSSPropertiesRaw` as the upstream `CSS.Properties<string | number>` type and use it for style and class-name transformer output, retaining numeric lengths. Update the direct `csstype` dependency to `^3.2.4` so consumers can resolve future 3.x definitions without a Fluentic release; existing lockfiles still require dependency updates.
