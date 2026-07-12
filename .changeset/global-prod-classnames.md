---
"@fluentic/style": patch
---

Make production class names globally dedupe extracted rules by deriving callsite-local hashing from dev mode only. Keep debug class names configurable from plugin and runtime CSS options, with dev defaulting to readable names and production defaulting to compact hashes.
