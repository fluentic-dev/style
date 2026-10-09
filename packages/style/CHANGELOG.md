# @fluentic/style

## 0.1.0-beta.8

### Patch Changes

- Improve Next.js RSC development CSS stability.

  - Include imported `createValues(...)` and named-token `getToken(...)` values
    in RSC dev precollected CSS so initial server styles match the dev
    stylesheet.
  - Use stable project-relative callsites for RSC dev local CSS variables,
    including values imported from shared theme modules.
  - Include the installed package identity in the Next.js cache key so local
    tarball/package changes invalidate dev CSS caches.
  - Increase the default dev/debug hash suffix from 3 to 5 characters to avoid
    readable class-name collisions in large debug stylesheets while preserving
    explicit `hashLength` configuration.

## 0.1.0-beta.7

### Patch Changes

- Keep Preact and SolidJS JSX type augmentations opt-in so React projects using
  `@fluentic/style/plugin/jsx` no longer need optional framework peers installed.

  - Keep React JSX `css` prop types in the default package type bundle.
  - Add explicit `@fluentic/style/types/preact` and
    `@fluentic/style/types/solid` type entrypoints for Preact and SolidJS
    projects.
  - Document the required project-level declaration-file import and update the
    Preact and SolidJS examples.

## 0.1.0-beta.6

### Patch Changes

- 2bff82f: Improve css-prop adapters, class-name extraction, and Next.js build stability.

  - Preserve normal JSX prop precedence when compiling intrinsic `css` props through React, Preact, and Solid adapters.
  - Keep React `key` props outside generated css-prop spreads so list identity is preserved.
  - Improve React Server Component development handling for css-prop adapter imports, including client components.
  - Make class-name extraction produce stable debug hashes and better source locations for class-name utilities.
  - Add Tailwind class-name support for arbitrary text values such as `text-[13px]`, `text-[length:13px]`, and `text-[color:purple]`.
  - Improve Next.js integration for dev CSS delivery, Turbopack loader options, and production CSS precollection.
  - Add default export conditions for common package entry points.

## 0.1.0-beta.5

### Patch Changes

- Add attachable selector sheets for styling fixed third-party class names
  without emitting global CSS.

  - Add `style.selector(...)` selector targets and `createSheet(...)` from
    `@fluentic/style/css` for manual selector rules that still attach through
    generated Fluentic classes.
  - Support selector overrides and token overrides inside sheets so component
    wrappers can expose local third-party themes with the same shape as
    scoped style composition.
  - Add `&` and `&?` selector handling for attached-element and portal-friendly
    selector rules. Comma-separated selector strings are rejected; pass an
    array when a rule should target multiple selectors.
  - Add `createStyleTarget(...)` for applying style props to explicit DOM
    targets such as `document.body`, with shared-target reference counting for
    overlapping portal users.
  - Make `combineStyle(...)` compose sheets directly, and add
    `combineStyle.with(...)` plus array-only `combineStyle.multi(...)` for
    cache-friendly style and sheet composition.
  - Support selector sheet extraction, local token overrides, debug class
    names, source tracing, and sourcemap data across runtime and extracted
    builds.
  - Add Preact css-prop support with a `CssPropPresets.Preact` compiler
    preset, runtime adapters, JSX types, and a Vite example.
  - Keep plugin css-prop configuration focused on `CssPropPresets` instead of
    exporting each framework preset as a separate top-level plugin API.
  - Add `style.important(...)` and `className.important(...)` for interop cases
    that need emitted `!important` declarations, especially selector sheets
    wrapping third-party CSS.
  - Add `style.weight(...)` as the style-object counterpart to
    `className.weight(...)`.
  - Keep the extracted production runtime below 5 KB minified and gzipped with
    `combineStyle` included, and keep selector parsing helpers out of the
    extracted production entry.
  - Add a React Select third-party selectors example, Preact integration docs,
    and a clearer third-party styling guide for selector sheets, style targets,
    portal menus, and the new `combineStyle` helpers.

## 0.1.0-beta.4

### Patch Changes

- Slim the extracted production runtime token path and fix named token refs in token-bound extracted styles.

  - Keep token symbols, guards, naming, and extracted token helpers in builder/runtime internals instead of the public style token surface.
  - Split extracted combine, token resolution, CSS variable, scope, and debug config helpers so extracted builds retain less eager runtime code.
  - Make named tokens carry their extracted CSS variable name so production token bindings can reference named token values without compiler metadata errors.
  - Hide manual stable ids from the public token and theme factory types while preserving internal compiler-provided identities.
  - Add snapshot and runtime contract coverage for createToken, createTokens, createValues, createTheme, scopes, bindScope, combineStyle, and named-token refs in extracted output.
  - Keep the Parcel optimizer on Node's `Buffer` import path and declare the Parcel example polyfill dependency so workspace builds do not rely on Parcel auto-install.

## 0.1.0-beta.3

### Patch Changes

- fd4a705: Make production class names globally dedupe extracted rules by deriving callsite-local hashing from dev mode only. Keep debug class names configurable from plugin and runtime CSS options, with dev defaulting to readable names and production defaulting to compact hashes.

## 0.1.0-beta.2

This beta adds class-name style chains, Tailwind presets, and compiler support
for transform-driven styling.

### Highlights

- Add `createClassNameFn` for class-name-driven style builders.
- Support nested class-name values, conditional falsy entries, weighted
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
