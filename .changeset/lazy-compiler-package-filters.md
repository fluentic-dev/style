---
"@fluentic/style": patch
---

Reduce build-time work by evaluating local bindings and imported exports only when style compilation needs them. Preserve declaration environments, cycle handling, and transitive dependency invalidation, reuse dependency hashes within a compilation, and skip runtime-import rewriting when it is unnecessary.

Add includePackages and excludePackages options for exact npm package names. Package exclusions take precedence over package inclusions, matching inclusions override file patterns for JavaScript and TypeScript files, and unmatched files retain existing filter behavior. Adapt package rules and defaults to Vite's native transform-hook filters while retaining the shared compatibility check.
