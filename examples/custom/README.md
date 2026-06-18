# Custom design-system builders

Small Vite example for composing multiple typed style functions.

The example exports three builders from `src/style.ts`:

```txt
style  component structure, slots, normal app selectors
sx     layout and responsive shortcuts
ui     interaction, tone, and surface utilities
```

Component code keeps `style.slot(...)` as the target and uses fixed
`style.merge(...)` to append complete chains from `sx` and `ui`:

```ts
style.merge(
  style.slot({ color: 'black' }),
  sx({ row: true, center: true }),
  sx().md({ gapX: 12 }),
  ui({ elevated: true, pill: true }),
  ui().hover({ color: 'teal' }),
);
```

The compiler setup registers every imported builder with its own style function
meta:

```ts
stylePlugin({
  importSources: [
    { source: './style', name: 'style', styleFn: style },
    { source: './style', name: 'sx', styleFn: sx },
    { source: './style', name: 'ui', styleFn: ui },
  ],
});
```

Run it with:

```sh
pnpm --filter @example/custom dev
pnpm --filter @example/custom build
pnpm --filter @example/custom verify
```
