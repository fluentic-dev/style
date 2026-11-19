# LLM Basic

A complete React + Vite example for `@fluentic/style`. The app demonstrates:

- Independent component tokens and public root/icon/label slots.
- Size and appearance variants through scopes, resolved with `bindScope` and `combineStyle`.
- App values connected to component tokens and switched with light/dark themes.
- Consumer slot overrides through `theme`, root overrides through `css`, and native button props.
- Focus-visible, hover, disabled, responsive layout, and working event handlers.

## Run in this repository

```sh
pnpm install
pnpm --filter @fluentic/style build
pnpm --filter @example/llm-basic dev
```

`pnpm llms:check` validates the guides and typechecks/builds this example.
`pnpm --filter @example/llm-basic test:browser` checks the production bundle in
installed Google Chrome. Set `CHROME_PATH` to a Chromium executable if needed.
Run the build first. The browser check covers theme changes, variants, public slot
and root overrides, disabled/hover/focus behavior, button events, and mobile layout.

## Generated agent guide

`scripts/sync-llms.mjs` generates `/style/llms/example.txt` from this directory.
The guide includes the runnable config and source files. Its package manifest is
adapted for standalone installation: the workspace dependency becomes the current
Fluentic package version, and repository-only browser test tooling is omitted.
Do not maintain a second hand-written copy of the example in the LLM guides.

## Agent evaluation protocol

These are evaluation tasks, not claims of completed independent agent trials.
Start each in a fresh project with only the published `llms.txt` URL as Fluentic
context. Record model/version, files fetched, input/output tokens if available,
build results, and corrections required. Do not preload this repository.

1. Build a React/Vite settings card with icon/title/action slots, compact and
   regular variants, light/dark themes, consumer part overrides and root css.
   Require keyboard focus and disabled behavior. Verify production behavior as
   well as compilation. Use a card rather than reproducing this Button verbatim.
2. Migrate a small Tailwind button with explicit fixture values: `px-4` = 1rem,
   `py-2` = 0.5rem, background #2563eb, hover #1d4ed8, white text, `md` = 768px
   with 1.5rem horizontal padding, dark background #60a5fa, disabled opacity 0.5,
   and a 2px focus-visible outline. Preserve its native props and event handlers.
   Compare the source fixture and Fluentic output across both themes, breakpoint
   sides and interaction states. Do not assume Tailwind defaults or claim parity
   merely because the build passes.

Success means no missing setup steps or invented APIs, correct composition and
runtime behavior, and no unexplained visual differences in migration. Compare
selective reading with the full guide; measure token savings instead of assuming
that fewer files or shorter prose necessarily improves task success.
