---
"@fluentic/style": patch
---

Improve css-prop adapters, class-name extraction, and Next.js build stability.

- Preserve normal JSX prop precedence when compiling intrinsic `css` props through React, Preact, and Solid adapters.
- Keep React `key` props outside generated css-prop spreads so list identity is preserved.
- Improve React Server Component development handling for css-prop adapter imports, including client components.
- Make class-name extraction produce stable debug hashes and better source locations for class-name utilities.
- Add Tailwind class-name support for arbitrary text values such as `text-[13px]`, `text-[length:13px]`, and `text-[color:purple]`.
- Improve Next.js integration for dev CSS delivery, Turbopack loader options, and production CSS precollection.
- Add default export conditions for common package entry points.
