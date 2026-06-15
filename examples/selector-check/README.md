# Selector check example

This example has two useful test paths:

```sh
pnpm --filter @example/selector-check dev:runtime
```

Pure runtime dev loads the page. Click cases or run all cases; invalid selectors should be caught at runtime and printed in the browser console.

```sh
pnpm --filter @example/selector-check dev:plugin:no-check
```

This is the best mode for browsing all cases with the plugin installed. It skips build-time selector checks so the page can load, then runtime dev checks each case.

```sh
pnpm --filter @example/selector-check check:plugin
```

This runs every case as an isolated virtual module through the plugin compiler paths. Use it when you want to see all build-time selector-check messages and codeframes in one terminal run.

```sh
pnpm --filter @example/selector-check dev:plugin
pnpm --filter @example/selector-check dev:plugin:force
```

Plugin dev validates static selectors during transform. These commands should stop Vite on the first invalid static selector before the page loads.
That first-failure behavior is expected: build-time checks are fail-fast, so use `dev:plugin:no-check` when you want to inspect every case in the UI.
