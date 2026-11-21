---
"@fluentic/style": patch
---

Enable persistent production transform caching by default, with content and resolution validation across dependency chains, compiler versions, and configuration changes. Restore immutable tracer syntax metadata across builds and safely reuse evaluated imports within a build. Set `persistentCache: false` to disable disk caching.

Preserve collected CSS when restoring transforms and avoid unnecessary production source-map callbacks in the Vite adapter. Add regression coverage for stale dependencies, changed resolution, corrupt caches, process restarts, lazy exports, and circular imports.

Preserve callable token types when existing tokens are passed to `createTokens`.
