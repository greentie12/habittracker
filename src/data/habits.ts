import { getInternalUserId } from '@/lib/getInternalUserId';
import { db } from '@/db';
import { habits, habitCategories, habitLogs, habitStreaks } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

export interface HabitForDate {
  id: string;
  habitName: string;
  type: 'binary' | 'measurable';
  categoryName: string | null;
  categoryColor: string | null;
  completed: boolean;
  value: number | null;
  targetValue: number | null;
  targetUnit: string | null;
  currentStreak: number;
  notes: string | null;
}

export async function getHabitsForDate(date: string): Promise<HabitForDate[]> {
  const userId = await getInternalUserId();

  const rows = await db
    .select({
      id: habits.id,
      name: habits.name,
      type: habits.type,
      targetValue: habits.targetValue,
      targetUnit: habits.targetUnit,
      categoryName: habitCategories.name,
      categoryColor: habitCategories.color,
      logValue: habitLogs.value,
      logNotes: habitLogs.notes,
      logCompletedAt: habitLogs.completedAt,
      currentStreak: habitStreaks.currentStreak,
    })
    .from(habits)
    .leftJoin(habitCategories, eq(habits.categoryId, habitCategories.id))
    .leftJoin(
      habitLogs,
      and(eq(habitLogs.habitId, habits.id), eq(habitLogs.loggedDate, date)),
    )
    .leftJoin(habitStreaks, eq(habitStreaks.habitId, habits.id))
    .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)))
    .orderBy(habits.sortOrder, habits.createdAt);

  return rows.map((row) => ({
    id: row.id,
    habitName: row.name,
    type: row.type,
    categoryName: row.categoryName ?? null,
    categoryColor: row.categoryColor ?? null,
    completed: row.logCompletedAt !== null,
    value: row.logValue !== null ? Number(row.logValue) : null,
    targetValue: row.targetValue !== null ? Number(row.targetValue) : null,
    targetUnit: row.targetUnit ?? null,
    currentStreak: row.currentStreak ?? 0,
    notes: row.logNotes ?? null,
  }));
}
