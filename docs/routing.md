# Routing

## Route Structure

All application routes live under `/dashboard`. The root `/` is a public landing page only.

```
/                         — public landing page
/dashboard                — protected: main dashboard
/dashboard/habit/new      — protected: create a habit
/dashboard/weekly         — protected: weekly view
```

Do not create routes outside `/dashboard` for authenticated features.

## Protected Routes

All `/dashboard` routes are protected via **Next.js middleware** (`src/middleware.ts`). Do not duplicate protection logic in individual page components or data helpers for routes already covered by middleware.

Use `clerkMiddleware` with `createRouteMatcher` from `@clerk/nextjs/server`:

```ts
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

`auth.protect()` redirects unauthenticated users to the Clerk sign-in flow automatically. Do not manually call `redirect()` for auth failures in middleware.

## Adding New Routes

When adding a new page inside `/dashboard`:

1. Create the file at `src/app/dashboard/<route>/page.tsx` — middleware protection is automatic.
2. Do not add a separate `auth()` or `getInternalUserId()` call in the page component for the purpose of redirecting — middleware handles that.
3. Data helpers in `/data` **must still** call `getInternalUserId()` to scope queries to the current user. Middleware protects the route; data helpers enforce data isolation. See `auth.md` and `data-fetching.md`.

## Public Routes

Any route not matched by `/dashboard(.*)` is public by default. If you need a new public route (e.g., a marketing page), no middleware changes are required — simply do not place it under `/dashboard`.

## What Is Not Allowed

- Placing authenticated features outside `/dashboard`
- Protecting individual page components with `redirect()` instead of relying on middleware for `/dashboard` routes
- Using the Pages Router (`pages/` directory) — App Router only
- Catching auth failures in middleware and returning a custom JSON response — use `auth.protect()` for redirects
