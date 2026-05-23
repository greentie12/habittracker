import { getInternalUserId } from '@/lib/getInternalUserId';
import { db } from '@/db';
import { habits, habitCategories, habitLogs, habitStreaks } from '@/db/schema';
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { format, getDate, getDay, parseISO, subDays } from 'date-fns';

export interface CreateHabitInput {
  name: string;
  description?: string | null;
  type: 'binary' | 'measurable';
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'custom';
  frequencyConfig?: { days: number[] } | null;
  categoryId?: string | null;
  targetValue?: number | null;
  targetUnit?: string | null;
  archivedAt?: Date | null;
}

export async function createHabit(input: CreateHabitInput) {
  const userId = await getInternalUserId();

  const [habit] = await db
    .insert(habits)
    .values({
      userId,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      frequencyType: input.frequencyType,
      frequencyConfig: input.frequencyConfig ?? null,
      categoryId: input.categoryId ?? null,
      targetValue: input.targetValue != null ? String(input.targetValue) : null,
      targetUnit: input.targetUnit ?? null,
      archivedAt: input.archivedAt ?? null,
    })
    .returning({ id: habits.id, name: habits.name });

  return habit;
}

export interface HabitCategory {
  id: string;
  name: string;
  color: string | null;
}

export async function getCategories(): Promise<HabitCategory[]> {
  const userId = await getInternalUserId();

  return db
    .select({ id: habitCategories.id, name: habitCategories.name, color: habitCategories.color })
    .from(habitCategories)
    .where(eq(habitCategories.userId, userId))
    .orderBy(habitCategories.name);
}

export async function toggleHabitLog(habitId: string, date: string): Promise<void> {
  const userId = await getInternalUserId();

  const [existing] = await db
    .select({ id: habitLogs.id, completedAt: habitLogs.completedAt })
    .from(habitLogs)
    .where(
      and(
        eq(habitLogs.habitId, habitId),
        eq(habitLogs.loggedDate, date),
        eq(habitLogs.userId, userId),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.completedAt !== null) {
      // Was completed — un-complete it
      await db.delete(habitLogs).where(eq(habitLogs.id, existing.id));
      await recalculateStreak(habitId);
    } else {
      // Was skipped — mark as completed
      await db
        .update(habitLogs)
        .set({ completedAt: new Date(), updatedAt: new Date() })
        .where(eq(habitLogs.id, existing.id));
      await updateStreakOnLog(habitId, date);
    }
  } else {
    await db.insert(habitLogs).values({
      habitId,
      userId,
      loggedDate: date,
      completedAt: new Date(),
    });
    await updateStreakOnLog(habitId, date);
  }
}

export interface HabitSummary {
  id: string;
  name: string;
  categoryName: string | null;
  categoryColor: string | null;
  isActive: boolean; // false = archived, available to re-add
}

export async function getArchivedHabits(): Promise<HabitSummary[]> {
  const userId = await getInternalUserId();
  const rows = await db
    .select({
      id: habits.id,
      name: habits.name,
      categoryName: habitCategories.name,
      categoryColor: habitCategories.color,
      archivedAt: habits.archivedAt,
    })
    .from(habits)
    .leftJoin(habitCategories, eq(habits.categoryId, habitCategories.id))
    .where(eq(habits.userId, userId))
    .orderBy(habits.name);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    categoryName: r.categoryName ?? null,
    categoryColor: r.categoryColor ?? null,
    isActive: r.archivedAt === null,
  }));
}

export async function getSkippedHabitsForDate(date: string): Promise<HabitSummary[]> {
  const userId = await getInternalUserId();
  const rows = await db
    .select({
      id: habits.id,
      name: habits.name,
      categoryName: habitCategories.name,
      categoryColor: habitCategories.color,
    })
    .from(habits)
    .leftJoin(habitCategories, eq(habits.categoryId, habitCategories.id))
    .innerJoin(
      habitLogs,
      and(
        eq(habitLogs.habitId, habits.id),
        eq(habitLogs.loggedDate, date),
        eq(habitLogs.userId, userId),
        isNull(habitLogs.completedAt),
      ),
    )
    .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)))
    .orderBy(habits.name);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    categoryName: r.categoryName ?? null,
    categoryColor: r.categoryColor ?? null,
    isActive: true,
  }));
}

export async function reactivateHabit(
  habitId: string,
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'custom',
  frequencyConfig: { days: number[] } | null,
): Promise<void> {
  const userId = await getInternalUserId();
  await db
    .update(habits)
    .set({ archivedAt: null, frequencyType, frequencyConfig, updatedAt: new Date() })
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
}

export async function unskipHabitForDay(habitId: string, date: string): Promise<void> {
  const userId = await getInternalUserId();
  await db
    .delete(habitLogs)
    .where(
      and(
        eq(habitLogs.habitId, habitId),
        eq(habitLogs.loggedDate, date),
        eq(habitLogs.userId, userId),
        isNull(habitLogs.completedAt),
      ),
    );
}

export async function archiveHabit(habitId: string): Promise<void> {
  const userId = await getInternalUserId();
  await db
    .update(habits)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
}

export async function deleteHabitPermanently(habitId: string): Promise<void> {
  const userId = await getInternalUserId();
  await db
    .delete(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
}

export async function updateHabitValue(habitId: string, date: string, value: number): Promise<void> {
  const userId = await getInternalUserId();

  if (value === 0) {
    await db
      .delete(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.loggedDate, date), eq(habitLogs.userId, userId)));
    await recalculateStreak(habitId);
    return;
  }

  const [habit] = await db
    .select({ targetValue: habits.targetValue })
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .limit(1);

  const target = habit?.targetValue != null ? Number(habit.targetValue) : null;
  const wasAlreadyComplete = await (async () => {
    const [log] = await db
      .select({ completedAt: habitLogs.completedAt })
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.loggedDate, date), eq(habitLogs.userId, userId)))
      .limit(1);
    return log?.completedAt != null;
  })();

  const nowComplete = target != null && value >= target;
  const completedAt = nowComplete ? new Date() : null;

  await db
    .insert(habitLogs)
    .values({ habitId, userId, loggedDate: date, value: String(value), completedAt })
    .onConflictDoUpdate({
      target: [habitLogs.habitId, habitLogs.loggedDate],
      set: { value: String(value), completedAt, updatedAt: new Date() },
    });

  if (nowComplete && !wasAlreadyComplete) {
    await updateStreakOnLog(habitId, date);
  } else if (!nowComplete && wasAlreadyComplete) {
    await recalculateStreak(habitId);
  }
}

export async function skipHabitForDay(habitId: string, date: string): Promise<void> {
  const userId = await getInternalUserId();

  const [existing] = await db
    .select({ id: habitLogs.id, completedAt: habitLogs.completedAt })
    .from(habitLogs)
    .where(
      and(
        eq(habitLogs.habitId, habitId),
        eq(habitLogs.loggedDate, date),
        eq(habitLogs.userId, userId),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.completedAt !== null) {
      // Was completed — remove completion and mark skipped
      await db
        .update(habitLogs)
        .set({ completedAt: null, updatedAt: new Date() })
        .where(eq(habitLogs.id, existing.id));
      await recalculateStreak(habitId);
    }
    // Already skipped — nothing to do
  } else {
    // Insert a skipped log (completedAt stays null)
    await db.insert(habitLogs).values({ habitId, userId, loggedDate: date });
  }
}

async function updateStreakOnLog(habitId: string, date: string): Promise<void> {
  const yesterday = format(subDays(parseISO(date), 1), 'yyyy-MM-dd');

  const [streakRecord] = await db
    .select()
    .from(habitStreaks)
    .where(eq(habitStreaks.habitId, habitId))
    .limit(1);

  if (streakRecord?.lastCompletedDate === date) return;

  const newStreak =
    streakRecord?.lastCompletedDate === yesterday
      ? (streakRecord.currentStreak ?? 0) + 1
      : 1;

  const newLongest = Math.max(newStreak, streakRecord?.longestStreak ?? 0);

  await db
    .insert(habitStreaks)
    .values({ habitId, currentStreak: newStreak, longestStreak: newLongest, lastCompletedDate: date })
    .onConflictDoUpdate({
      target: habitStreaks.habitId,
      set: { currentStreak: newStreak, longestStreak: newLongest, lastCompletedDate: date, updatedAt: new Date() },
    });
}

async function recalculateStreak(habitId: string): Promise<void> {
  const logs = await db
    .select({ loggedDate: habitLogs.loggedDate })
    .from(habitLogs)
    .where(eq(habitLogs.habitId, habitId))
    .orderBy(desc(habitLogs.loggedDate));

  if (logs.length === 0) {
    await db
      .update(habitStreaks)
      .set({ currentStreak: 0, lastCompletedDate: null, updatedAt: new Date() })
      .where(eq(habitStreaks.habitId, habitId));
    return;
  }

  let streak = 1;
  for (let i = 1; i < logs.length; i++) {
    const expected = format(subDays(parseISO(logs[i - 1].loggedDate), 1), 'yyyy-MM-dd');
    if (logs[i].loggedDate === expected) streak++;
    else break;
  }

  const [existing] = await db
    .select({ longestStreak: habitStreaks.longestStreak })
    .from(habitStreaks)
    .where(eq(habitStreaks.habitId, habitId))
    .limit(1);

  await db
    .insert(habitStreaks)
    .values({
      habitId,
      currentStreak: streak,
      longestStreak: Math.max(streak, existing?.longestStreak ?? 0),
      lastCompletedDate: logs[0].loggedDate,
    })
    .onConflictDoUpdate({
      target: habitStreaks.habitId,
      set: {
        currentStreak: streak,
        longestStreak: Math.max(streak, existing?.longestStreak ?? 0),
        lastCompletedDate: logs[0].loggedDate,
        updatedAt: new Date(),
      },
    });
}

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

function habitScheduledForDate(
  frequencyType: string,
  frequencyConfig: unknown,
  date: string,
): boolean {
  if (frequencyType === 'daily') return true;

  const config = frequencyConfig as { days?: number[] } | null;
  const days = config?.days ?? [];

  if (frequencyType === 'weekly') {
    // days: 0=Sun … 6=Sat
    return days.includes(getDay(parseISO(date)));
  }
  if (frequencyType === 'monthly') {
    // days: 1-31
    return days.includes(getDate(parseISO(date)));
  }
  // custom: show every day for now
  return true;
}

export async function getHabitsForDate(date: string): Promise<HabitForDate[]> {
  const userId = await getInternalUserId();

  const rows = await db
    .select({
      id: habits.id,
      name: habits.name,
      type: habits.type,
      frequencyType: habits.frequencyType,
      frequencyConfig: habits.frequencyConfig,
      targetValue: habits.targetValue,
      targetUnit: habits.targetUnit,
      createdAt: habits.createdAt,
      categoryName: habitCategories.name,
      categoryColor: habitCategories.color,
      logId: habitLogs.id,
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

  return rows
    .filter((row) => {
      // Don't show habit for dates before it was created
      const createdDate = format(row.createdAt, 'yyyy-MM-dd');
      if (date < createdDate) return false;
      if (!habitScheduledForDate(row.frequencyType, row.frequencyConfig, date)) return false;
      // skipped = log exists with no completedAt AND no value; in-progress (value set) should still show
      if (row.logId !== null && row.logCompletedAt === null && row.logValue === null) return false;
      return true;
    })
    .map((row) => ({
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
