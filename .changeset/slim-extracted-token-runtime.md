---
"@fluentic/style": patch
---

Slim the extracted production runtime token path and fix named token refs in token-bound extracted styles.

- Keep token symbols, guards, naming, and extracted token helpers in builder/runtime internals instead of the public style token surface.
- Split extracted combine, token resolution, CSS variable, scope, and debug config helpers so extracted builds retain less eager runtime code.
- Make named tokens carry their extracted CSS variable name so production token bindings can reference named token values without compiler metadata errors.
- Hide manual stable ids from the public token and theme factory types while preserving internal compiler-provided identities.
- Add snapshot and runtime contract coverage for createToken, createTokens, createValues, createTheme, scopes, bindScope, combineStyle, and named-token refs in extracted output.
- Keep the Parcel optimizer on Node's `Buffer` import path and declare the Parcel example polyfill dependency so workspace builds do not rely on Parcel auto-install.
