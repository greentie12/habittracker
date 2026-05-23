import { getInternalUserId } from '@/lib/getInternalUserId';
import { db } from '@/db';
import { habits, habitCategories, habitLogs } from '@/db/schema';
import { and, eq, gte, isNull, lte, isNotNull } from 'drizzle-orm';
import { addDays, format, getDate, getDay, parseISO } from 'date-fns';

export interface DaySummary {
  date: string;
  dayLabel: string;
  dayNum: number;
  scheduled: number;
  completed: number;
  rate: number; // 0–100
  isFuture: boolean;
}

export interface HabitWeekCell {
  scheduled: boolean;
  completed: boolean;
  partial: boolean; // measurable: value > 0 but < target
  isFuture: boolean;
}

export interface HabitWeekRow {
  habitId: string;
  habitName: string;
  categoryColor: string | null;
  type: 'binary' | 'measurable';
  cells: HabitWeekCell[]; // index 0 = Monday … 6 = Sunday
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  days: DaySummary[];
  habitRows: HabitWeekRow[];
  overallRate: number;
}

export function isScheduled(
  frequencyType: string,
  frequencyConfig: unknown,
  date: string,
): boolean {
  if (frequencyType === 'daily' || frequencyType === 'custom') return true;
  const config = frequencyConfig as { days?: number[] } | null;
  const days = config?.days ?? [];
  if (frequencyType === 'weekly') return days.includes(getDay(parseISO(date)));
  if (frequencyType === 'monthly') return days.includes(getDate(parseISO(date)));
  return true;
}

export async function getWeeklySummary(weekStart: string): Promise<WeeklySummary> {
  const userId = await getInternalUserId();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Build Mon–Sun date list
  const dates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(parseISO(weekStart), i), 'yyyy-MM-dd'),
  );
  const weekEnd = dates[6];

  // Fetch all active habits
  const allHabits = await db
    .select({
      id: habits.id,
      name: habits.name,
      type: habits.type,
      frequencyType: habits.frequencyType,
      frequencyConfig: habits.frequencyConfig,
      targetValue: habits.targetValue,
      categoryColor: habitCategories.color,
      createdAt: habits.createdAt,
    })
    .from(habits)
    .leftJoin(habitCategories, eq(habits.categoryId, habitCategories.id))
    .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)))
    .orderBy(habits.sortOrder, habits.createdAt);

  // Fetch all logs for the week (completed only — skip logs have completedAt=null,value=null)
  const allLogs = await db
    .select({
      habitId: habitLogs.habitId,
      loggedDate: habitLogs.loggedDate,
      completedAt: habitLogs.completedAt,
      value: habitLogs.value,
    })
    .from(habitLogs)
    .where(
      and(
        eq(habitLogs.userId, userId),
        gte(habitLogs.loggedDate, weekStart),
        lte(habitLogs.loggedDate, weekEnd),
      ),
    );

  // Index logs by habitId+date
  const logMap = new Map<string, typeof allLogs[number]>();
  for (const log of allLogs) {
    logMap.set(`${log.habitId}:${log.loggedDate}`, log);
  }

  // Build per-day summaries and habit rows
  const daySummaries: DaySummary[] = dates.map((date) => {
    const isFuture = date > today;
    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const idx = dates.indexOf(date);

    let scheduled = 0;
    let completed = 0;

    for (const habit of allHabits) {
      if (date < format(habit.createdAt, 'yyyy-MM-dd')) continue;
      if (!isScheduled(habit.frequencyType, habit.frequencyConfig, date)) continue;
      scheduled++;
      const log = logMap.get(`${habit.id}:${date}`);
      if (log?.completedAt != null) completed++;
    }

    return {
      date,
      dayLabel: DAY_LABELS[idx],
      dayNum: getDate(parseISO(date)),
      scheduled,
      completed,
      rate: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0,
      isFuture,
    };
  });

  // Build habit rows
  const habitRows: HabitWeekRow[] = allHabits.map((habit) => {
    const cells: HabitWeekCell[] = dates.map((date) => {
      const isFuture = date > today;
      const beforeCreation = date < format(habit.createdAt, 'yyyy-MM-dd');
      const scheduled = !beforeCreation && isScheduled(habit.frequencyType, habit.frequencyConfig, date);
      const log = logMap.get(`${habit.id}:${date}`);
      const completed = scheduled && log?.completedAt != null;
      const hasValue = log?.value != null && Number(log.value) > 0;
      const target = habit.targetValue != null ? Number(habit.targetValue) : null;
      const partial =
        scheduled &&
        !completed &&
        hasValue &&
        (target == null || Number(log!.value) < target);

      return { scheduled, completed, partial, isFuture };
    });

    return {
      habitId: habit.id,
      habitName: habit.name,
      categoryColor: habit.categoryColor ?? null,
      type: habit.type,
      cells,
    };
  });

  // Overall rate across past + today days only
  const pastDays = daySummaries.filter((d) => !d.isFuture);
  const totalScheduled = pastDays.reduce((s, d) => s + d.scheduled, 0);
  const totalCompleted = pastDays.reduce((s, d) => s + d.completed, 0);
  const overallRate =
    totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  return { weekStart, weekEnd, days: daySummaries, habitRows, overallRate };
}
