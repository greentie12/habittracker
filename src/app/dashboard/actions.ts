"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { archiveHabit, deleteHabitPermanently, reactivateHabit, skipHabitForDay, toggleHabitLog, unskipHabitForDay, updateHabitValue } from "@/data/habits";
import { getCalendarStatus, type CalendarDayStatus } from "@/data/calendar";

const ToggleSchema = z.object({
  habitId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function toggleHabitAction(habitId: string, date: string): Promise<void> {
  const { habitId: id, date: d } = ToggleSchema.parse({ habitId, date });
  await toggleHabitLog(id, d);
  revalidatePath("/dashboard");
}

export async function skipHabitAction(habitId: string, date: string): Promise<void> {
  const { habitId: id, date: d } = ToggleSchema.parse({ habitId, date });
  await skipHabitForDay(id, d);
  revalidatePath("/dashboard");
}

export async function updateHabitValueAction(habitId: string, date: string, value: number): Promise<void> {
  const { habitId: id, date: d } = ToggleSchema.parse({ habitId, date });
  z.number().int().min(0).parse(value);
  await updateHabitValue(id, d, value);
  revalidatePath("/dashboard");
}

export async function unskipHabitAction(habitId: string, date: string): Promise<void> {
  const { habitId: id, date: d } = ToggleSchema.parse({ habitId, date });
  await unskipHabitForDay(id, d);
  revalidatePath("/dashboard");
}

export async function archiveHabitAction(habitId: string): Promise<void> {
  z.string().min(1).parse(habitId);
  await archiveHabit(habitId);
  revalidatePath("/dashboard");
}

export async function deleteHabitPermanentlyAction(habitId: string): Promise<void> {
  z.string().min(1).parse(habitId);
  await deleteHabitPermanently(habitId);
  revalidatePath("/dashboard");
}

const ReactivateSchema = z.object({
  habitId: z.string().min(1),
  frequencyType: z.enum(["daily", "weekly", "monthly", "custom"]),
  frequencyConfig: z.object({ days: z.array(z.number().int()) }).nullable(),
});

export async function reactivateHabitAction(
  habitId: string,
  frequencyType: "daily" | "weekly" | "monthly" | "custom",
  frequencyConfig: { days: number[] } | null,
): Promise<void> {
  const parsed = ReactivateSchema.parse({ habitId, frequencyType, frequencyConfig });
  await reactivateHabit(parsed.habitId, parsed.frequencyType, parsed.frequencyConfig);
  revalidatePath("/dashboard");
}

const CalendarStatusSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
});

export async function getCalendarStatusAction(
  year: number,
  month: number,
): Promise<Record<string, CalendarDayStatus>> {
  const { year: y, month: m } = CalendarStatusSchema.parse({ year, month });
  return getCalendarStatus(y, m);
}
