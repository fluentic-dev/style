# Releasing @fluentic/style

Read this guide before preparing or publishing a release. `AGENTS.md` contains the
Git tag rule. Package publishing, pushing a release commit/tag, and creating a
GitHub Release are separate actions; follow the scope requested by the maintainer.
Preparing a release does not itself publish to npm.

## Prepare the version

1. Use the repository's pinned pnpm version (`packageManager` in `package.json`).
   Run `pnpm install --frozen-lockfile`. Inspect `git status`, the current branch,
   and `git remote -v`; preserve unrelated work. Fetch the intended remote and
   check that the release branch is up to date before pushing.
2. Add a `.changeset/<description>.md` file (or use `pnpm changeset`) with the
   package name, bump level, and consumer-facing description. Include packaging
   and dependency changes even when runtime behavior is unchanged.
3. Inspect `.changeset/pre.json`. While it says `mode: pre` and `tag: beta`,
   `pnpm version-packages` prepares the next beta. Do not run `changeset pre exit`
   unless a stable release was requested. Do not manually guess/increment versions.
4. Review `packages/style/package.json`, `packages/style/CHANGELOG.md`, and
   `.changeset/pre.json`. Private examples and benchmarks are not versioned or
   tagged. Refresh the lockfile if dependency metadata changed.
5. Build the versioned package, then run `pnpm report:bundle:update`. Review
   `reports/bundle-size.json`, `reports/bundle-size.md`, and the generated table in
   `docs/content/src/content/docs/benchmark/bundle-size.mdx`. Include significant
   changes and exact gzip byte counts in the release notes. These reports must
   be refreshed for **every** prepared release, even when code size is unchanged.
   Never copy older measurements or edit measured values manually.
   `pnpm report:bundle:check` independently rebuilds the measured entry bundles
   and fails if report data, docs, package version, or recorded tooling is stale.

## TypeScript toolchain

Workspace `tsc` commands use native TypeScript 7.0.2, installed as
`typescript-native`. The `typescript` name aliases Microsoft's
`@typescript/typescript6@6.0.2` compatibility package for tools using the legacy
JavaScript API (including Next.js, MDX tooling, and the autocomplete benchmark).
Its legacy CLI is `tsc6`, so it does not shadow native `tsc`.

Declaration builds run native `tsc --emitDeclarationOnly` on the public export
roots. A lightweight compatibility-API pass rewrites relative declaration
specifiers to `.js` and `/index.js`; it does not type-check or emit the types.
Watch mode finalizes declarations after successful native compilations. Package
checks validate the generated tarball under both TypeScript 5.9 and 7 with
Bundler, Node16, and NodeNext resolution.

## Packaging contract

- Author implementation in TypeScript; publish compiled JavaScript for runtime
  exports and generated declarations for every public type export.
- `pnpm --filter @fluentic/style build` builds JavaScript, then runs `build:types`.
  `prepack` runs this build too, so a clean checkout cannot pack missing/stale types.
  `pnpm --filter @fluentic/style dev` builds once, then watches JavaScript and
  declarations together. Restart it after changing the package export map.
- `build-types.mjs` discovers public roots from the type export map, checks their
  source graph, and emits declarations under `dist/types`. Relative declaration
  imports include `.js` and directory indexes for Node16/NodeNext consumers.
  The directory tree under `dist/types` mirrors source paths; retain this mapping
  when adding exports. Type-only exports must also have declaration roots.
- Keep declaration references self-contained. Consumers must never load Fluentic
  implementation `.ts` files to obtain types. Source may remain in the tarball for
  debugging. Required external declaration dependencies belong in dependencies
  or the documented host/framework peers, not only devDependencies.
- Babel is a direct compiler dependency. Framework/bundler peers are required
  only for the corresponding integration.
- Declaration emission does not prove internal correctness under stricter flags.
  Internal source checks and consumer compatibility checks are distinct gates.

## Required validation

Run `pnpm release:check` before any release commit/tag. It performs:

1. Package build (declarations must exist before workspace consumers type-check),
   followed by `pnpm report:bundle:check` against the committed reports and docs.
2. `pnpm check`: lint, formatting, and all workspace TypeScript projects.
3. `pnpm test`: library/compiler/runtime tests and bundle-report generation/staleness tests.
4. `pnpm build`: package, examples with build scripts, and benchmark app builds.
5. `pnpm --filter @example/nextjs test:prod`: Next.js production build and verification
   (Next.js has no generic `build` script, so the workspace build does not cover it).
6. `pnpm test:package`: pack the actual package, install it outside the workspace,
   validate export targets, and compile strict consumers with Bundler, Node16,
   and NodeNext ESM resolution, including JSX and integration exports. Next.js
   integration declarations are checked in Bundler mode because Next.js itself
   does not pass the Node16/NodeNext declaration checks. This runs with
   `skipLibCheck: false`, `noUncheckedIndexedAccess`, and checks that no Fluentic
   implementation source entered the consumer program. It also builds and checks
   React, Preact, Solid, and Tailwind examples against the tarball, and imports the Vite
   adapter without installing Babel as a consumer dependency.

Do not waive failures silently. Fix regressions and rerun affected checks; report
external/environment failures precisely. Record actual results in the release
notes. Network access is needed for isolated consumer installation. Failed package
fixtures remain in the printed temporary directory for inspection.

## Commit, publish, and tag

1. Write `releases/v<VERSION>.md` with changes, migration instructions, validation,
   and any limitations. This is the copy-ready GitHub Release body. Review the
   complete diff, including generated changelog and prerelease metadata, and commit
   all release changes. Confirm the working tree is clean.
2. When npm publication is requested, run `pnpm release`. It repeats the validation
   gates and calls `changeset publish --no-git-tag`. Changesets uses the active beta
   prerelease channel. Verify the exact version and registry dist-tag afterwards
   with `pnpm view @fluentic/style@<VERSION> version dist.tarball` and
   `pnpm view @fluentic/style dist-tags --json`.
3. Create the annotated tag on the tested release commit:
   `git tag -a v<VERSION> -m "Release v<VERSION>"`.
   Never create `@fluentic/style@<VERSION>` tags. Do not use bare
   `changeset publish` or `changeset tag`; their workspace tagging conflicts with
   this convention. Never move an existing release tag.
4. When pushing is requested, push the release branch and exact tag together:
   `git push --atomic origin HEAD:<BRANCH> refs/tags/v<VERSION>`.
   Verify remote branch and tag objects using `git ls-remote`.
5. For GitHub, use the existing version tag and `releases/v<VERSION>.md` body.
   Mark beta versions as prereleases. If only copy-ready notes were requested,
   provide the file and leave GitHub Release creation to the maintainer.

A requested tag-only release can skip npm publication; explicitly report that npm
has not been published. A Git tag or GitHub Release does not publish the npm package.

## Recovery

- If validation fails, do not publish or tag; fix it and repeat affected checks.
- If publishing fails, inspect the registry for the exact version before retrying:
  it may already have succeeded. Never overwrite/reuse an npm version for changed
  contents. Prepare a new changeset/version when a published artifact needs a fix.
- If npm succeeded but Git push failed, preserve the release commit/tag and resolve
  the remote/authentication issue. Do not force-push or retag another commit.
- If only GitHub Release creation failed, retry it using the existing tag and notes.
- Report independently whether validation, npm publication, remote push, and GitHub
  Release creation succeeded; never imply that one proves the others.
