# Compiler Transform Notes

This document records the core extracted compiler transform behavior. It covers
style-function transforms in general, independent of any specific dialect.

Named string refs and named-token lookup for dialect-style transforms are
documented in [`named-token-transform.md`](./named-token-transform.md).

## Goal

After extraction, compiled code should no longer need the source style chain
function for already-compiled styles.

The compiler may use the style function transform while compiling. The compiled
program should contain extracted style helpers, extracted token bindings, and
remaining runtime values only.

## Static Style Objects

Static style objects are transformed at compile time.

Source:

```tsx
const card = ui({
  row: true,
  gap: 12,
});
```

Example transform:

```ts
transform(style) {
  const { row, ...css } = style;
  if (row) {
    css.display = 'flex';
    css.flexDirection = 'row';
  }
  return css;
}
```

Compiled shape:

```tsx
const card = createExtractedStyle([
  ['1nca60l', 'display-flex-bce3oj8'],
  ['1a6hjt3', 'flex-row-s4ciid0'],
  ['1phh07j', 'gap-b1apwtx'],
]);
```

The extracted CSS contains real CSS properties. Custom transform-only input
properties do not remain as CSS declarations.

## Dynamic Runtime Values

When a transformed property contains a runtime expression, the compiler keeps
the runtime expression dynamic and extracts the CSS property around it.

Source:

```tsx
export function Card({ color }) {
  return style({
    color,
    backgroundColor: 'white',
  });
}
```

Compiled shape:

```tsx
const token = createExtractedToken('...', null);
const card = createExtractedStyle([
  ['18q1j80', 'color-bhvjcp4', [1, '--var-color', token, 1]],
  ['mwx9540', 'background-color-white-bovvp2a'],
]);

export function Card({ color }) {
  return withTokens(card, [token(color)]);
}
```

The runtime value is not interpreted by the compiler. It is bound through the
normal extracted token path.

## Inline Literal Branches

Runtime expressions with inline literal branches can be partially transformed.
Each literal branch is transformed independently, then the transformed branch
value is emitted back into the runtime expression.

Source:

```tsx
export function Stack({ vertical }) {
  return layout({
    direction: vertical ? 'column' : 'row',
  });
}
```

Example transform:

```ts
transform(style) {
  const { direction, ...css } = style;
  if (direction) css.flexDirection = direction;
  return css;
}
```

Compiled shape:

```tsx
const token = createExtractedToken('...', null);
const stack = createExtractedStyle([
  ['1a6hjt3', 'flex-direction-v22jid0', [1, '--var-direction', token, 1]],
]);

export function Stack({ vertical }) {
  return withTokens(stack, [
    token(vertical ? 'column' : 'row'),
  ]);
}
```

This lets transforms rewrite the CSS property while preserving the runtime
condition.

## Top-Level Dynamic Styles

When a dynamic style expression is outside a function parent, the compiler keeps
the expression in place instead of hoisting it into a reusable local declaration.

Source:

```tsx
const compact = !!window.compact;

export const rule = style({
  padding: compact ? 8 : 12,
});
```

Compiled shape:

```tsx
export const rule = createExtractedStyle([
  [
    '1ffb9qm',
    'padding-jus0s20',
    [1, '--var-padding', compact ? 8 : 12, 1],
  ],
]);
```

This is an extraction/hoisting decision. It is not a special runtime transform
resolver.

## Hoisted Declaration Order

When a hoisted extracted style references extracted token placeholders, token
declarations must appear before the style declaration.

Expected order:

```tsx
const token = createExtractedToken('...', null);
const style = createExtractedStyle([
  ['mwx9540', 'background-color-c41zqz0', [1, '--var-bg', token, 1]],
]);
```

Wrong order:

```tsx
const style = createExtractedStyle([
  ['mwx9540', 'background-color-c41zqz0', [1, '--var-bg', token, 1]],
]);
const token = createExtractedToken('...', null);
```

The snapshot verifier checks this ordering for transformed runtime values.

## Verification

Primary coverage:

- `packages/style/tests/compiler.test.ts`
  - `compiler extracts merged style chains`
- `examples/snapshots/data/002-transform`
- `examples/snapshots/data/005-custom-design-system`

Useful commands:

```bash
pnpm --filter @fluentic/style test -- compiler.test.ts
pnpm --filter @example/snapshots generate-and-verify
```
