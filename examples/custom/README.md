# Custom createStyleFn example

Small Vite example for trying a local style builder made with `createStyleFn`.

The important compiler setup is in `vite.config.ts`:

```ts
stylePlugin({
  selectors: customSelectors,
  importSources: [
    { source: './style', name: 'customStyle' },
  ],
});
```

`importSources` tells the Babel compiler that `customStyle` imported from `./style` should be treated like the default `style` builder.

Run it with:

```sh
pnpm --filter @example/custom dev
pnpm --filter @example/custom build
```
