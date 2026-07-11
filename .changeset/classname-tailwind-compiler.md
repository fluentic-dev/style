---
"@fluentic/style": minor
---

This beta adds class-name style chains, Tailwind presets, and compiler support
for transform-driven styling.

- Add `createClassNameFn` for class-name-driven style builders.
- Support nested class-name values, conditional falsey entries, weighted
  class-name tokens, selector chaining, at-rules, and merges.
- Add compiler extraction for class-name style chains.
- Add Tailwind presets for both style-object and class-name authoring.
- Add `classNameTransform`, `classNameValue`, and transform metadata for
  preserving source class labels in emitted rules.
- Add named token compiler support for static extraction and theme override
  identity.
- Add configurable transform class-name formatting and hash length behavior for
  debug output.
