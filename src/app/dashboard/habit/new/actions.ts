"use server";

import { z } from "zod";
import { createHabit } from "@/data/habits";
import { redirect } from "next/navigation";

const CreateHabitSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).nullable().optional(),
  type: z.enum(["binary", "measurable"]),
  consistency: z.enum(["daily", "weekly", "monthly", "none"]),
  frequencyConfig: z.object({ days: z.array(z.number().int()) }).nullable().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  targetValue: z.number().positive().nullable().optional(),
  targetUnit: z.string().max(50).nullable().optional(),
  saveToLibrary: z.boolean(),
});

export type CreateHabitFormInput = z.infer<typeof CreateHabitSchema>;

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function createHabitAction(
  input: CreateHabitFormInput
): Promise<ActionResult> {
  const parsed = CreateHabitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { consistency, saveToLibrary, ...rest } = parsed.data;

  // "none" consistency has no schedule — always goes to library
  const goToLibrary = saveToLibrary || consistency === "none";
  // Map "none" to "custom" for the DB enum (no active schedule)
  const frequencyType = consistency === "none" ? "custom" : consistency;

  try {
    await createHabit({
      ...rest,
      frequencyType,
      archivedAt: goToLibrary ? new Date() : null,
    });
  } catch {
    return { success: false, error: "Failed to create habit. Please try again." };
  }

  redirect("/dashboard");
}
