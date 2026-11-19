---
"@fluentic/style": patch
---

Publish generated TypeScript declarations for every public type entry point instead of exposing implementation sources to consumer type checking. Preserve compiled runtime exports and support strict consumers using Bundler, Node16, and NodeNext resolution. Make Babel and its public declaration dependency explicit compiler dependencies. Correct Solid JSX module augmentation without replacing framework types, and declare Solid as an optional integration peer. Keep static value evaluation on runtime exports. Add packed-package compatibility checks and document the release workflow.
