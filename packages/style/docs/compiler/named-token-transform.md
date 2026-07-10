# Named Token Transform Notes

This document records compiler behavior for style-function transforms that
accept named string refs and resolve them to named tokens or literal scale
values. This is useful for Tailwind-like dialects, but it is not a
Tailwind-specific compiler feature.

It builds on the core transform behavior documented in
[`transform.md`](./transform.md).

## Goal

Named string refs such as `'$accent'` or `'$blue.600'` are compile-time input
syntax when they are visible inside the style expression. Extracted output
should contain extracted CSS helpers, extracted token bindings, and runtime
values. It should not retain the source style function just to resolve named
strings later.

This is the Fluentic-supported way to build dialect-style APIs that accept
readable named strings while still compiling to named-token-aware extracted CSS.
The source API can accept `'$name'` strings, the transform converts those strings
to named tokens or literals, and the compiler/runtime use the same regular
token machinery as hand-written Fluentic tokens.

## Userland Transform Shape

A dialect can expose custom properties such as `bg`, `px`, or `rounded`, then
resolve named string refs in its transform. The important part is that named
string lookup happens inside the style-function transform, and the transform
returns normal CSS properties with normal Fluentic token values or literals.

Example:

```tsx
import { createStyleFn, styleTransform, type } from '@fluentic/style';
import { createNamedTokens, getNamedToken } from '@fluentic/style/dialect';

const Colors = createNamedTokens('app.color', {
  accent: '#0f766e',
  panel: '#ffffff',
  blue: {
    600: '#2563eb',
  },
});

const spacing = {
  4: '1rem',
  5: '1.25rem',
};

type UiStyle = {
  bg?: string | typeof Colors.accent;
  px?: string;
};

function resolveScale(scale: Record<string, unknown>, value: unknown) {
  const token = typeof value === 'string' ? getNamedToken(scale, value) : undefined;
  if (token) return token;

  if (typeof value === 'string' && value.startsWith('$')) {
    return scale[value.slice(1)] ?? value;
  }

  return value;
}

export const { style: ui } = createStyleFn({
  style: type<UiStyle>,
  selectors: {},
  transform: styleTransform<UiStyle>({
    transform(style) {
      const css: Record<string, unknown> = {};

      if (style.bg !== undefined) {
        css.backgroundColor = resolveScale(Colors, style.bg);
      }

      if (style.px !== undefined) {
        const value = resolveScale(spacing, style.px);
        css.paddingInline = value;
      }

      return css;
    },
  }),
});
```

With that transform, source code can use readable named strings:

```tsx
ui({
  bg: '$blue.600',
  px: '$4',
});
```

The transform result is equivalent to:

```ts
{
  backgroundColor: Colors.blue[600],
  paddingInline: '1rem',
}
```

The compiler then handles `Colors.blue[600]` as normal named token data. There
is no separate compiler feature for the dialect; the compiler only consumes the
style-function transform result.

## Static Named Refs

Source:

```tsx
ui({
  bg: '$panel',
  gap: '$4',
});
```

Example transform result:

```ts
{
  backgroundColor: Colors.panel,
  gap: '1rem',
}
```

Compiled shape:

```tsx
const style = createExtractedStyle([
  ['mwx9540', 'background-color-bweossh'],
  ['1phh07j', 'gap-j550dy0'],
]);
```

The dialect input properties and named string refs are transformed during
compilation. Extracted CSS contains real CSS properties and values.

## Inline Dynamic Literal Branches

Inline named-string branches are visible to the compiler, so each branch is
resolved during compilation.

Source:

```tsx
ui({
  bg: featured ? '$accentSoft' : '$panel',
  borderColor: featured ? '$accent' : '$border',
});
```

Compiled shape:

```tsx
const token = createExtractedToken('...', null);
const style = createExtractedStyle([
  ['mwx9540', 'background-color-c41zqz0', [1, '--var-bg', token, 1]],
]);

withTokens(style, [
  token(
    featured
      ? 'var(--token-app-color-accentSoft-..., #d9f4ee)'
      : 'var(--token-app-color-panel-..., #ffffff)',
  ),
]);
```

Important properties:

- The transform controls property mapping, such as `bg -> backgroundColor`.
- Literal named string branches are transformed to CSS-assignable values.
- Named token values become `var(--token-id, fallback)` strings.
- The compiled output does not retain the source style function for this case.

## Top-Level Dynamic Literal Branches

Top-level dynamic expressions cannot be hoisted into a reusable local
declaration, but inline named-string branches are still resolved during
compilation.

Source:

```tsx
const featured = !!window.snapshotFeatured;

export const card = ui({
  bg: featured ? '$blue.600' : '$emerald.600',
});
```

Compiled shape:

```tsx
export const card = createExtractedStyle([
  [
    'mwx9540',
    'background-color-c41zqz0',
    [
      1,
      '--var-bg',
      featured
        ? 'var(--token-app-color-blue-600-..., #2563eb)'
        : 'var(--token-app-color-emerald-600-..., #059669)',
      1,
    ],
  ],
]);
```

## Opaque Runtime Values

Opaque runtime values are not interpreted as named string refs by the compiler.

Source:

```tsx
export function Swatch({ swatch }) {
  return <span css={ui({ bg: swatch })} />;
}
```

Compiled shape:

```tsx
const token = createExtractedToken('...', null);
const style = createExtractedStyle([
  ['mwx9540', 'background-color-b4wq19y', [1, '--var-bg', token, 1]],
]);

export function Swatch({ swatch }) {
  return <span css={withTokens(style, [token(swatch)])} />;
}
```

The compiler only applies the transform shape that it can know from the style
property:

```tsx
bg -> backgroundColor
```

It does not try to resolve `swatch` as a string such as `'$blue.600'`.

## Dynamic Named Tokens

Runtime data that chooses colors or other tokens dynamically should carry token
objects, not named string refs.

Source:

```tsx
const plans = [
  ['Starter', Colors.blue[600]],
  ['Scale', Colors.emerald[600]],
];

plans.map(([, swatch]) => {
  return <span css={ui({ bg: swatch })} />;
});
```

Compiled shape:

```tsx
const token = createExtractedToken('...', null);
const style = createExtractedStyle([
  ['mwx9540', 'background-color-b4wq19y', [1, '--var-bg', token, 1]],
]);

withTokens(style, [token(swatch)]);
```

Named tokens are regular Fluentic token data. The existing extracted token
binding path handles them.

## Unsupported Runtime String Lookup

This pattern is intentionally not supported by extracted transform handling:

```tsx
const plans = [
  ['Starter', '$blue.600'],
  ['Scale', '$emerald.600'],
];

plans.map(([, swatch]) => {
  return <span css={ui({ bg: swatch })} />;
});
```

Supporting this would require preserving a named-string resolver in compiled
output. Source should use named tokens instead:

```tsx
const plans = [
  ['Starter', Colors.blue[600]],
  ['Scale', Colors.emerald[600]],
];
```

## Tailwind-Like Dialects

A Tailwind-like dialect can use this same mechanism by defining a style
function transform that maps utility-shaped props to CSS properties and resolves
named string refs against named-token scales.

The compiler does not need a Tailwind-only branch. It only sees:

- a style function with a transform;
- source values that are either static, inline literal branches, or opaque
  runtime expressions;
- transformed values that may be named tokens, token overrides, literals, or
  runtime expressions.

## Verification

Primary coverage:

- `packages/style/tests/compiler.test.ts`
  - `compiler transforms dynamic tailwind scale refs before hoisting runtime variables`
  - `compiler leaves opaque tailwind runtime values on regular token binding path`
- `examples/snapshots/data/006-tailwind-runtime-transform`
- `examples/snapshots/verify.ts`
  - verifies no retained source style-function import
  - verifies inline named-string branches compile to token var strings
  - verifies dynamic named tokens use regular `createExtractedToken`/`withTokens`
  - verifies hoisted token placeholders are declared before styles that reference them

Useful commands:

```bash
pnpm --filter @fluentic/style test -- compiler.test.ts
pnpm --filter @example/snapshots generate-and-verify
pnpm --dir examples/tailwind build
```
