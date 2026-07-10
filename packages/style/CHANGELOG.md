# @fluentic/style

## 0.1.0-beta.2

### Minor Changes

- Add class-name style chains with `createClassNameFn`, weighted utility values,
  selector chaining, at-rule support, merge support, and static compiler
  extraction.
- Split the Tailwind preset into style-object and class-name entry points so
  teams can choose object-first or utility-class authoring from the same preset
  package.
- Add named token compiler support and docs for transform extraction behavior.

### Patch Changes

- Improve debug class names for transformed class utilities, including readable
  transform class metadata in extracted output.
- Refresh docs for presets, class-name chains, numeric values, runtime/compiler
  tradeoffs, plugin options, and imports.
- Add a Vite React Tailwind className example app.

## 0.1.0-beta.1

### Patch Changes

- Add `createSelectorAssert` for typed custom selector validators and improve selector preset documentation.

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
