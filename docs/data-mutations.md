# Data Mutations

## Overview

All data mutations follow a two-layer pattern:

1. **`src/data/` helpers** — thin wrappers around Drizzle ORM that own all database access
2. **`actions.ts` server actions** — co-located with the route that needs them, validate input, call `src/data/` helpers, and return results to the client

No component, page, or route handler may write to the database directly.

---

## Layer 1: `src/data/` Helper Functions

Mutation helpers live alongside read helpers in `src/data/` (e.g. `src/data/habits.ts`). They follow the same rules as read helpers — see `data-fetching.md` — with the additional constraints below.

### User data isolation

Every mutation helper must resolve the authenticated user's ID internally and scope every write to that user. Never accept a `userId` parameter from the caller.

```ts
// src/data/habits.ts
import { getInternalUserId } from '@/lib/getInternalUserId';
import { db } from '@/db';
import { habits } from '@/db/schema';

export async function createHabit(input: CreateHabitInput) {
  const userId = await getInternalUserId(); // always derive from session

  return db.insert(habits).values({ ...input, userId }).returning();
}
```

### Drizzle ORM only

Use Drizzle's query builder for all writes. No raw SQL (`db.execute(sql`...`)`), no string interpolation, no direct `pg` calls.

```ts
// WRONG
await db.execute(sql`UPDATE habits SET name = ${name} WHERE id = ${id}`);

// CORRECT
await db.update(habits).set({ name }).where(eq(habits.id, id));
```

---

## Layer 2: Server Actions in `actions.ts`

### File placement

Server actions must live in an `actions.ts` file co-located with the route segment that uses them.

```
src/app/
  dashboard/
    page.tsx
  habits/
    create/
      page.tsx
      actions.ts   ← server actions for the create-habit route
    [id]/
      edit/
        page.tsx
        actions.ts ← server actions for the edit-habit route
```

### `"use server"` directive

Every `actions.ts` file must start with the `"use server"` directive.

```ts
"use server";
```

### Typed parameters — no `FormData`

All server action parameters must be explicitly typed. `FormData` is not allowed as a parameter type. Parse form state into plain typed objects on the client before calling the action, or use a schema-validated object directly.

```ts
// WRONG
export async function createHabit(formData: FormData) { ... }

// CORRECT
export async function createHabit(input: CreateHabitInput) { ... }
```

### Zod validation

Every server action must validate its arguments with Zod before touching any data helper. Parse with `schema.parse()` (throws on failure) or `schema.safeParse()` (returns a result object) — choose whichever fits the error-handling style of the action.

```ts
"use server";

import { z } from "zod";
import { createHabit } from "@/data/habits";

const CreateHabitSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["binary", "measurable"]),
  categoryId: z.string().uuid().nullable(),
  targetValue: z.number().positive().optional(),
  targetUnit: z.string().optional(),
  frequencyType: z.enum(["daily", "weekly", "monthly", "custom"]),
});

type CreateHabitInput = z.infer<typeof CreateHabitSchema>;

export async function createHabitAction(input: CreateHabitInput) {
  const parsed = CreateHabitSchema.parse(input); // throws ZodError on invalid input
  return createHabit(parsed);
}
```

Place schemas in the same `actions.ts` file unless they are reused across multiple action files, in which case extract them to `src/lib/schemas/`.

### Return values

Return plain serializable values (objects, arrays, primitives). Do not return Drizzle result objects or database rows with non-serializable fields.

---

## Summary checklist

| Rule | Where it applies |
|---|---|
| All DB writes go through `src/data/` helpers | `src/data/*.ts` |
| Helpers resolve `userId` from session internally | `src/data/*.ts` |
| Drizzle ORM only — no raw SQL | `src/data/*.ts` |
| All server actions live in co-located `actions.ts` | `src/app/**` |
| `actions.ts` starts with `"use server"` | `actions.ts` |
| Parameters are explicitly typed — no `FormData` | `actions.ts` |
| All inputs validated with Zod before any data call | `actions.ts` |
