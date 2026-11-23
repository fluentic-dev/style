# Shared docs playground

`@docs/playground` is a private workspace package shared by the Next.js docs
(`docs/app`) and Docusaurus docs (`docs/basic`). Both apps build and serve their
own `/playground/` route. No separate service or deployment is required.

Edit `src/PlaygroundApp.tsx`, the examples, compiler, runtime worker, or styles here
to update both playgrounds. The compiler intentionally uses the repository's style
implementation so the playground tracks current development.

The host passes `docsUrl` and `logoUrl`; the shared UI has no Next.js or Docusaurus
dependency. Keep these URLs base-path aware. The Docusaurus route lazy-loads the
playground in `BrowserOnly`, so Monaco and browser workers do not run during SSR
or load on ordinary documentation pages.

Both hosts alias `@babel/core` to `@docs/playground/babel-browser` in their Webpack
configuration. This provides Babel Standalone for compiler utilities without
bundling Node filesystem/config loading. Docusaurus also disables Babel’s `iterableIsArray` assumption: the compiler spreads
Sets and Maps and must retain standard iterable behavior. Monaco workers and the runtime worker
are emitted by each host's bundler using `new Worker(new URL(..., import.meta.url))`.

## Verify changes

```sh
pnpm --filter @docs/basic typecheck
pnpm --filter @docs/basic build
pnpm --filter @docs/app typecheck
pnpm --filter @docs/app build
```

Check both playground routes in a browser: load an example, edit the source,
inspect the preview and generated CSS, and follow the Docs link back to the host.
Local dev ports are 6790 for the new docs and 6789 for the old docs.
