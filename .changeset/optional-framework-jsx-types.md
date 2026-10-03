---
"@fluentic/style": patch
---

Keep Preact and SolidJS JSX type augmentations opt-in so React projects using
`@fluentic/style/plugin/jsx` no longer need optional framework peers installed.

- Keep React JSX `css` prop types in the default package type bundle.
- Add explicit `@fluentic/style/types/preact` and
  `@fluentic/style/types/solid` type entrypoints for Preact and SolidJS
  projects.
- Document the required project-level declaration-file import and update the
  Preact and SolidJS examples.
