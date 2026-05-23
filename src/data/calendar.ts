import { getInternalUserId } from '@/lib/getInternalUserId';
import { db } from '@/db';
import { habits, habitLogs } from '@/db/schema';
import { and, eq, gte, isNull, lte } from 'drizzle-orm';
import { eachDayOfInterval, format, getDaysInMonth, parseISO } from 'date-fns';
import { isScheduled } from './weekly';

export type CalendarDayStatus = 'complete' | 'missed' | 'future';

export async function getCalendarStatus(
  year: number,
  month: number, // 1-based
): Promise<Record<string, CalendarDayStatus>> {
  const userId = await getInternalUserId();
  const today = format(new Date(), 'yyyy-MM-dd');

  const monthStart = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
  const monthEnd = format(
    new Date(year, month - 1, getDaysInMonth(new Date(year, month - 1))),
    'yyyy-MM-dd',
  );

  const days = eachDayOfInterval({
    start: parseISO(monthStart),
    end: parseISO(monthEnd),
  }).map((d) => format(d, 'yyyy-MM-dd'));

  const allHabits = await db
    .select({
      id: habits.id,
      frequencyType: habits.frequencyType,
      frequencyConfig: habits.frequencyConfig,
      createdAt: habits.createdAt,
    })
    .from(habits)
    .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)));

  const allLogs = await db
    .select({
      habitId: habitLogs.habitId,
      loggedDate: habitLogs.loggedDate,
      completedAt: habitLogs.completedAt,
    })
    .from(habitLogs)
    .where(
      and(
        eq(habitLogs.userId, userId),
        gte(habitLogs.loggedDate, monthStart),
        lte(habitLogs.loggedDate, monthEnd),
      ),
    );

  const logMap = new Map<string, (typeof allLogs)[number]>();
  for (const log of allLogs) {
    logMap.set(`${log.habitId}:${log.loggedDate}`, log);
  }

  const result: Record<string, CalendarDayStatus> = {};

  for (const date of days) {
    const isFuture = date > today;
    let scheduled = 0;
    let completed = 0;

    for (const habit of allHabits) {
      if (date < format(habit.createdAt, 'yyyy-MM-dd')) continue;
      if (!isScheduled(habit.frequencyType, habit.frequencyConfig, date)) continue;
      scheduled++;
      if (!isFuture) {
        const log = logMap.get(`${habit.id}:${date}`);
        if (log?.completedAt != null) completed++;
      }
    }

    if (scheduled === 0) continue;

    if (isFuture) {
      result[date] = 'future';
    } else if (completed === scheduled) {
      result[date] = 'complete';
    } else {
      result[date] = 'missed';
    }
  }

  return result;
}
