# Selector sheets and client-side global CSS

Run from the repository root:

```sh
pnpm --filter @fluentic/style build
pnpm --filter @example/third-party-selectors dev
```

`src/global.styles.ts` demonstrates `createGlobalSheet` in two ways:

- The client entry imports a document reset in the `reset` cascade layer. It styles
  `body`, form controls, and the root directly, without attaching a generated class.
  Development injects it immediately; the production build extracts it into CSS.
- **Underline all page headings** calls `highlightGlobalHeadings()` on click. Its
  global sheet is injected synchronously in development. With the Fluentic Vite
  plugin, production extracts this CSS even though the call is inside a function:
  headings are underlined on initial load without clicking. The
  heading data attribute is an ordinary CSS selector, not a Fluentic transport marker.

The React Select controls still use scoped `createSheet` styles, so this example
shows global document styles alongside styles attached to individual components.

To try the production build, with the underline available immediately:

```sh
pnpm --filter @example/third-party-selectors build
pnpm --filter @example/third-party-selectors serve
```

Global reset rules use `order: -1` in the `reset` layer; the heading underline uses
`order: 1`. Order places whole sheets before or after the regular/local groups,
while layers still control CSS cascade precedence.
