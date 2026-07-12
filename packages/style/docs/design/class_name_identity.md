# Class name identity

Fluentic class names have two jobs that pull in different directions:

- In development, a class name should point back to the source callsite that
  created it.
- In production, identical atomic declarations should collapse to one CSS rule.

The compiler and runtime choose the identity model from the mode. It is not a
user-facing `localClassName` option.

## Development

Development class names are callsite-local.

The atomic hash input includes the generated rule identity and the source
callsite:

```txt
property
priority
value
selector
parent selector
at-rule
file:line:column
```

This means two identical declarations from two different style calls can keep
different class names:

```ts
const one = style({ display: 'grid' });
const two = style({ display: 'grid' });
```

In dev mode, those two calls may emit two class names even though both rules are
`display: grid`. That duplication is intentional. It makes DevTools, sourcemaps,
runtime tracing, and readable debug class names point at the place where the
style came from, not just at the declaration shape.

`debugClassName` defaults to `true` in dev mode, so the class can include a
readable property/value prefix plus the hash. The hash is still always present.

## Production

Production class names are global atomic identities.

The atomic hash input excludes the source callsite:

```txt
property
priority
value
selector
parent selector
at-rule
```

With the same example:

```ts
const one = style({ display: 'grid' });
const two = style({ display: 'grid' });
```

Production extraction emits one `display: grid` rule and both styles reference
the same class. This is the same shape used by other atomic extraction systems:
the output is deduped by declaration identity, so the CSS stays minimal as the
app grows.

`debugClassName` defaults to `false` in production and build mode. If it is
explicitly enabled for an inspection build, the readable prefix may appear, but
the hash still uses the global production identity and still excludes the
callsite.

## Rules

- Hashes are always part of final class names.
- Callsite data is included in class hashes only in dev and RSC dev modes.
- Callsite data is excluded in production and RSC production modes.
- `localClassName` is internal mode-derived behavior, not plugin or runtime
  configuration.
- `debugClassName` is configurable by plugin CSS options and runtime CSS
  options.
- The default `debugClassName` value is `true` in dev mode and `false` in
  production/build mode.
