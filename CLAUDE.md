# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## IMPORTANT: Always Consult Docs First

**Before writing any code**, check the `.docs/` directory for relevant documentation. This directory contains project-specific guides, decisions, and references that take precedence over general knowledge. Find the most relevant file(s) for the task at hand and read them before proceeding.

- /docs/ui.md
- /docs/data-fetching.md
- /docs/data-mutations.md
- /docs/auth.md

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # run ESLint
```

## Stack

- **Next.js 16.2.6** with **React 19.2.4** — App Router only (no Pages Router)
- **TypeScript**, **Tailwind CSS v4** (PostCSS-based, not v3)
- Source lives in `src/app/` following App Router file conventions

## Next.js 16 Breaking Changes

This version has significant API changes from Next.js 14/15. Always read `node_modules/next/dist/docs/` before writing code.

**Caching model replaced** — `dynamic`, `revalidate`, `fetchCache` route segment exports are removed. Use the new `use cache` directive with `cacheLife` and `cacheTag` instead. See `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` for the old model.

**`params` is a Promise** — Route component props `params` and `searchParams` are now `Promise<...>`. Await them or pass the Promise to child components with their own `<Suspense>` boundaries.

**`experimental_ppr` removed** — Partial Prerendering is now configured differently.

**Instant navigations** — To get instant client-side navigations, export `unstable_instant` from route segments and wrap uncached data in `<Suspense>`. See `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`.

**Tailwind v4** — Uses `@tailwindcss/postcss` and the new CSS-first config. Do not use `tailwind.config.js` conventions from v3.
