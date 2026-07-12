# @fluentic/style

## 0.1.0-beta.4

### Patch Changes

- Slim the extracted production runtime token path and fix named token refs in token-bound extracted styles.

  - Keep token symbols, guards, naming, and extracted token helpers in builder/runtime internals instead of the public style token surface.
  - Split extracted combine, token resolution, CSS variable, scope, and debug config helpers so extracted builds retain less eager runtime code.
  - Make named tokens carry their extracted CSS variable name so production token bindings can reference named token values without compiler metadata errors.
  - Hide manual stable ids from the public token and theme factory types while preserving internal compiler-provided identities.
  - Add snapshot and runtime contract coverage for createToken, createTokens, createValues, createTheme, scopes, bindScope, combineStyle, and named-token refs in extracted output.

## 0.1.0-beta.3

### Patch Changes

- fd4a705: Make production class names globally dedupe extracted rules by deriving callsite-local hashing from dev mode only. Keep debug class names configurable from plugin and runtime CSS options, with dev defaulting to readable names and production defaulting to compact hashes.

## 0.1.0-beta.2

This beta adds class-name style chains, Tailwind presets, and compiler support
for transform-driven styling.

### Highlights

- Add `createClassNameFn` for class-name-driven style builders.
- Support nested class-name values, conditional falsey entries, weighted
  class-name tokens, selector chaining, at-rules, and merges.
- Add compiler extraction for class-name style chains.
- Add Tailwind presets for both style-object and class-name authoring.
- Add `classNameTransform`, `classNameValue`, and transform metadata for
  preserving source class labels in emitted rules.
- Add named token compiler support for static extraction and theme override
  identity.
- Add configurable transform class-name formatting and hash length behavior for
  debug output.

## 0.1.0-beta.1

This patch beta improves typed selector authoring and documentation.

### Changes

- Add `createSelectorAssert` for typed custom selector validators.
- Keep the public beta API moving with small usability refinements after
  `0.1.0-beta.0`.

## 0.1.0-beta.0

### First Public Beta

Fluentic Style is now available as a public beta.

This release introduces the main React styling workflow for building component
systems: typed style objects, a JSX `css` prop, reusable component slots,
scoped themes and variants, design tokens, runtime atomic CSS injection, and
optional static CSS extraction for production builds.

Included in this beta:

- typed style objects with `style(...)`
- component styling targets with `style.slot(...)`
- scoped theme, variant, state, and media styles with `style.scope(...)`
- component-level style resolution with `combineStyle(...)`
- design tokens with `createToken(...)`
- theme overrides with `createTheme(...)`
- JSX `css` prop support for DOM and SVG elements
- runtime atomic CSS injection for development and dynamic styles
- optional build-time CSS extraction for static styles
- integrations for Vite, Webpack, Rspack, Farm, Parcel, and Next.js
- React Server Component-aware runtime entries
- development utilities for readable class names, source tracing, and style
  debugging

The core authoring model is ready for early users. During beta, package exports,
bundler plugin behavior, and advanced compiler features may still be refined
based on real project feedback.
