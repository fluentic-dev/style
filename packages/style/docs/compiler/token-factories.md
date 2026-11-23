# Extracted Token Factories (beta.14)

## Definition-site lowering

The compiler replaces statically resolvable ordinary factories where they are
called, preserving their declarations and exports:

- `createToken` becomes `createExtractedToken(id, value, ref, name, varName)`.
  IDs and CSS variable names are computed at build time.
- `createTokens` becomes a nested object of extracted token leaves. There is no
  `createExtractedTokens` runtime helper. Nested arrays remain token defaults;
  top-level arrays produce value-keyed token maps, matching the authoring API.
- `createValues` becomes `createExtractedValues` with prebuilt key/token pairs.
  The compiler handles labels, numeric conversion, IDs, and variable names.

Schematic output (metadata strings abbreviated):

```ts
const accent = createExtractedToken('id', '#2563eb', null, 'accent', '--token-accent-hash');
const tokens = {
  color: { accent },
};
const color = createExtractedValues([
  [
    '#e8eaf0 | border',
    createExtractedToken('border-id', '#e8eaf0', null, 'border', '--token-border-hash'),
  ],
]);
const border = `1px solid ${getToken(color('#e8eaf0 | border'))}`;
```

Actual names follow ordinary token naming configuration. The group above shows
an alias for readability; factory-generated leaves are constructed inside the
nested object. Original object/array default references are preserved.

## Small runtime contract

`createExtractedToken` stores compiler-provided metadata and remains callable to
create overrides. Overrides retain the variable metadata and reference behavior.
`createExtractedValues` builds a `Map` and returns a callable lookup. It preserves
string versus number keys, cached token identity, duplicate-key semantics, and
explicit override arguments, including `undefined`. Missing keys throw
`VALUE_NOT_FOUND`. It performs no hashing or value-string parsing.

Extracted `getToken()` consumes the token's CSS variable metadata to return its
CSS variable reference and fallback. A standalone/module-level call therefore
works on compiled ordinary tokens, value-scale results, and named tokens. It
must not invent a variable name for an ordinary token lacking metadata: the
result could disagree with the compiler's configuration and generated CSS.

The beta.13 Reports failure occurred because a module initializer called this
metadata-only runtime on a value-scale token without that metadata. Transforming
the factory at its definition fixes the object before the initializer runs.

## References and remaining serialization

Extracted styles, slots, chains, and scope overrides retain usable source token
references, including imported aliases and re-exports. The evaluator records
source expressions and rebases them to the consuming module. Factory replacements
are applied after style evaluation, so the evaluator can still inspect the
original authoring calls. Pure annotations permit unused factories to be removed.

Not every generated token is a source factory binding. Hoisted dynamic styles
still need generated placeholder tokens; function-local token references must
be passed through dynamic bindings rather than referenced illegally at module
scope. Tokens created by custom transforms without a usable source reference
still need serialization. These cases explain remaining inline
`createExtractedToken` expressions in output.

## Constraints and coverage

Factory inputs must be statically resolvable. Unresolved inputs produce a build
diagnostic. Value-scale lookup keys and override values can vary at runtime.
Token-definition modules must pass through the extraction plugin, including
uncompiled dependency sources. Runtime/dev factories retain their authoring API.

Named-token global naming and lazy proxies are documented in
[`named-token-transform.md`](./named-token-transform.md).

Regression coverage lives in `packages/style/tests/extracted-tokens.test.ts`:
module initializers, imported/re-exported scales, custom factories and naming,
leaf inference, defaults and spreads, lookup identity, overrides, hoisting,
invalid inputs, and named-token collisions. Generated examples live in
`examples/snapshots/data/004-nested-tokens` and
`examples/snapshots/data/008-extracted-runtime-contract`.

Run `pnpm --filter @fluentic/style test` and
`pnpm --filter @example/snapshots generate-and-verify`.

## Direct property token variables

A property whose value is a token reads that token's CSS variable directly, with
its default value as the fallback. It does not allocate a property-local variable.
`combineStyle` writes supplied overrides to the token variable on each consuming
element; it does not automatically place them on a component root. Without an
override, the runtime leaves the variable unset so theme values can inherit.
Overrides therefore share one token value per element and can inherit into its
descendants. Dynamic non-token property values still use local variables.
