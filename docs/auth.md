# Authentication

## Provider: Clerk

This app uses [Clerk](https://clerk.com) exclusively for authentication. Do not introduce any other auth library or roll custom session management.

## ClerkProvider

`<ClerkProvider>` wraps the entire app in `src/app/layout.tsx`. Do not add it anywhere else.

## UI Components

Use Clerk's pre-built components for all auth-related UI. Do not build custom sign-in/sign-up forms.

| Use case | Component |
|---|---|
| Sign-in button | `<SignInButton mode="modal" />` |
| Sign-up button | `<SignUpButton mode="modal" />` |
| Signed-in/out conditional rendering | `<Show when="signed-in">` / `<Show when="signed-out">` |
| User avatar + account menu | `<UserButton />` |

Import from `@clerk/nextjs`.

## Getting the Current User (Server Side)

**Never** read the user's identity from query parameters, request bodies, or any caller-supplied value. Always derive it from the Clerk session on the server.

Use the `getInternalUserId()` helper in `src/lib/getInternalUserId.ts` — it resolves the Clerk session, maps `clerkId` → internal `users.id`, and redirects unauthenticated requests to `/`.

```ts
// src/data/habits.ts
import { getInternalUserId } from '@/lib/getInternalUserId';

export async function getHabits() {
  const userId = await getInternalUserId(); // always call this first
  return db.select().from(habits).where(eq(habits.userId, userId));
}
```

Call `getInternalUserId()` at the top of every `/data` helper that touches user-owned rows. See `data-fetching.md` for the full data-isolation rule.

## Raw Clerk Auth (Server Side)

If you need the Clerk ID directly (e.g., in middleware or a helper that doesn't need the internal ID), import from the server-only entrypoint:

```ts
import { auth } from '@clerk/nextjs/server';

const { userId: clerkId } = await auth();
```

Never import `auth` from `@clerk/nextjs` (the client entrypoint) in server code.

## Database: Users Table

Clerk manages identity; the database stores the internal user record. The `users` table in `src/db/schema.ts` has a `clerkId` column that links the two:

```
users.id       — internal UUID used in all FK relationships
users.clerkId  — Clerk's external user ID (used only for session → internal ID lookup)
```

All foreign keys in other tables reference `users.id`, never `users.clerkId`.

## Protected Routes

Protect routes by calling `getInternalUserId()` (or `auth()`) at the top of the server component or data helper — it redirects or throws before any data is read. Do not use middleware-based route protection unless there is an explicit reason to do so.

## What is Not Allowed

- Custom sign-in/sign-up pages or forms
- Storing passwords or tokens of any kind
- Passing `userId` as a prop or URL parameter and trusting it for data access
- Importing Clerk's server `auth()` in client components
- Any second auth provider alongside Clerk
