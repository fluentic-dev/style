---
"@fluentic/style": patch
---

Export the JSX import-source base paths so automatic JSX compilation can fall back to Fluentic's wrapped createElement when a key follows spread props. Preserve CSS prop handling and route the plugin fallback to development, production, and React Server Component runtimes, with generated TypeScript declarations.
