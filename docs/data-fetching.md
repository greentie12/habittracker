# Data Fetching

## Server Components Only

**All data fetching must be done exclusively via React Server Components.** Do not fetch data in:

- Route handlers (`app/api/`)
- Client components (`"use client"`)
- Middleware
- Any other mechanism

If a client component needs data, fetch it in a parent server component and pass it down as props.

## Database Access via `/data` Directory

All database queries must go through helper functions in the `/data` directory. Do not write queries inline in components or pages.

```
src/
  data/
    habits.ts      # e.g. getHabits(), createHabit(), etc.
    completions.ts
    ...
```

## Drizzle ORM Required

Helper functions in `/data` must use Drizzle ORM. **Do not use raw SQL.** No `db.execute(sql`...`)`, no string-interpolated queries, no direct `pg` calls.

```ts
// WRONG
const habits = await db.execute(sql`SELECT * FROM habits WHERE user_id = ${userId}`);

// CORRECT
const habits = await db.select().from(habitsTable).where(eq(habitsTable.userId, userId));
```

## User Data Isolation — Critical

Every query that returns user data **must** filter by the authenticated user's ID. A logged-in user must never be able to read, modify, or delete another user's data.

1. Retrieve the current user's ID from the session at the top of every helper function.
2. Always include a `where` clause scoping the query to that user ID.
3. Never accept a `userId` parameter from the caller — derive it from the session inside the helper to prevent callers from spoofing another user's ID.

```ts
// src/data/habits.ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { habitsTable } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function getHabits() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthenticated");

  return db
    .select()
    .from(habitsTable)
    .where(eq(habitsTable.userId, session.user.id));
}
```

Failing to enforce this rule is a **critical security vulnerability**. Every helper must validate the session and scope its query — no exceptions.
