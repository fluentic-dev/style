---
"@fluentic/style": patch
---

Compile token factories at their definitions and preserve token references in extracted styles. Token groups become nested objects of extracted token leaves; value scales use a small precompiled lookup helper. Standalone getToken calls now receive CSS-variable metadata, including values imported through re-exports.

Named tokens now use global, hash-free CSS variable names derived from their explicit namespace and property path, independent of tokenNameFormat and hashLength. Rebuild all consumers together and update external CSS references to the new names. Path segments escape punctuation to avoid collisions.

Use native TypeScript 7.0.2 for workspace checks and declaration emission, with TypeScript 6.0.2 API compatibility for tooling. Validate packed declarations with both TypeScript 5.9 and 7.
