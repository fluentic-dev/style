# @fluentic/style

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
