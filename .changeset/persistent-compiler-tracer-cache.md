---
"@fluentic/style": patch
---

Enable persistent production transform caching by default, with content and resolution validation across dependency chains, compiler versions, and configuration changes. Restore immutable tracer syntax metadata across builds and safely reuse evaluated imports within a build. Configure caching with `cache: { persistent, dynamicConfig, version, location }`. Persistence and callback source fingerprinting default to enabled; change `cache.version` when captured or external callback inputs change. The former `persistentCache` and plugin `cacheDir` options are removed.

Cache and replay check warnings and failures, including code frames, with dependency and severity invalidation. Preserve collected CSS when restoring transforms and avoid unnecessary production source-map callbacks in the Vite adapter. Add regression coverage for stale dependencies, changed resolution, corrupt caches, process restarts, lazy exports, and circular imports.

Preserve callable token types when existing tokens are passed to `createTokens`.
