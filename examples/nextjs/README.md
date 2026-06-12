# @fluentic/style with Next.js

This example uses the Next.js App Router with Turbopack or webpack, the dedicated
`@fluentic/style/plugin/nextjs` integration, and extracted Fluentic Style CSS.

The integration wires Fluentic's compiler through a Next-specific loader and keeps the `.next`
CSS replacement behavior out of the generic unplugin adapters.

The routes cover the default page, static export (`/ssg`), server rendering
(`/ssr`), React Server Components (`/rsc`), and a client component route
(`/client`).

## Run development mode

```sh
pnpm --filter @fluentic/style build
pnpm --filter @example/nextjs dev:turbo
```

Open <http://127.0.0.1:4180>.

Explicit bundler scripts:

```sh
pnpm --filter @example/nextjs dev:turbo
pnpm --filter @example/nextjs dev:webpack
```

## Build and start

```sh
pnpm --filter @fluentic/style build
pnpm --filter @example/nextjs build:turbo
pnpm --filter @example/nextjs start
```

Open <http://127.0.0.1:4180>.

Explicit bundler builds:

```sh
pnpm --filter @example/nextjs build:turbo
pnpm --filter @example/nextjs build:webpack
```

## Static export and serve

```sh
pnpm --filter @fluentic/style build
pnpm --filter @example/nextjs ssg:turbo
pnpm --filter @example/nextjs serve
```

Open <http://127.0.0.1:4180>.

The static export command is the same as running:

```sh
MODE=ssg next build
npx serve out -l tcp://127.0.0.1:4180
```

Explicit bundler static builds:

```sh
pnpm --filter @example/nextjs ssg:turbo
pnpm --filter @example/nextjs ssg:webpack
```

## Test extraction

```sh
pnpm --filter @fluentic/style build
pnpm --filter @example/nextjs test:prod
pnpm --filter @example/nextjs test:ssg
```

The verifiers check that:

- `.next/static` contains extracted CSS.
- `out` contains exported CSS in static mode.
- the virtual CSS marker was replaced.
- `/`, `/ssg`, `/ssr`, `/rsc`, and `/client` return HTML with class attributes.
