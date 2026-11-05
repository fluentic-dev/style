---
"@fluentic/style": patch
---

Resolve TypeScript path aliases when statically extracting imported theme
values. Imported `createValues(...)` palettes referenced through `tsconfig`
paths now extract correctly, including in React Server Component production
builds.
