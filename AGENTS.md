# Agent Notes

## Release tags

Use version-only annotated tags for releases, such as `v0.1.0-beta.8`.

Do not create package-prefixed tags such as `@fluentic/style@0.1.0-beta.8`.

## Release workflow

Read [RELEASING.md](RELEASING.md) before preparing, versioning, tagging, or publishing
any release. Run `pnpm release:check` and verify the packed declarations and consumer
examples before tagging. Public type exports must use generated declarations, never
implementation sources. Keep copy-ready GitHub notes in `releases/v<VERSION>.md`.

Before every release, build the package, run `pnpm report:bundle:update`, and review
the generated reports and bundle-size docs. `pnpm release:check` must confirm that
these measurements match the release version and current build.

## Public repository confidentiality

Do not include private consumer application or organization names, identifying
local checkout paths, or internal project details in source, tests, documentation,
release notes, commit messages, or tags. Describe consumer validation generically
and omit identifying measurements or examples. Audit staged content and outgoing
history before pushing. Keep local test tarballs out of commits.
