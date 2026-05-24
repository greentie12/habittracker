import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Plus, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "./DatePicker";
import { HabitLogItem } from "./HabitLogItem";
import { AddExistingHabitDialog } from "./AddExistingHabitDialog";
import { BottomNav } from "./BottomNav";
import { getArchivedHabits, getHabitsForDate } from "@/data/habits";
import { getCalendarStatus } from "@/data/calendar";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam ? parseISO(dateParam) : new Date();
  const dateStr = format(date, "yyyy-MM-dd");

  const [logs, allHabits, calendarStatus] = await Promise.all([
    getHabitsForDate(dateStr),
    getArchivedHabits(),
    getCalendarStatus(date.getFullYear(), date.getMonth() + 1),
  ]);

  const completed = logs.filter((l) => l.completed).length;
  const total = logs.length;

  // A habit is "active for this date" only if it's already showing on the dashboard today.
  // Habits not scheduled for this date should be selectable to re-add/reschedule.
  const onDashboardIds = new Set(logs.map((l) => l.id));
  const habitsForPicker = allHabits.map((h) => ({
    ...h,
    isActive: onDashboardIds.has(h.id),
  }));

  return (
    <>
      <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full max-[500px]:pb-24">
        {/* Header — hidden on mobile (≤500px), shown on desktop */}
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between max-[500px]:hidden">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <DatePicker selected={date} initialStatus={calendarStatus} />
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/weekly">
                <BarChart2 className="size-4" />
                Weekly
              </Link>
            </Button>
            <AddExistingHabitDialog archived={habitsForPicker} />
            <Button asChild size="sm">
              <Link href="/dashboard/habit/new">
                <Plus className="size-4" />
                Create Habit
              </Link>
            </Button>
          </div>
        </div>

        {/* Mobile-only page title */}
        <h1 className="hidden max-[500px]:block text-2xl font-semibold mb-4">Dashboard</h1>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Progress for {format(date, "EEEE, MMMM d")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {completed}
              <span className="text-muted-foreground text-lg font-normal"> / {total}</span>
            </p>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {logs.length > 0 ? (
            logs.map((log) => <HabitLogItem key={log.id} log={log} date={dateStr} />)
          ) : (
            <p className="text-center text-muted-foreground py-12">
              No habits for this date.
            </p>
          )}
        </div>
      </main>

      {/* Mobile bottom nav — only visible on ≤500px */}
      <BottomNav date={date} archived={habitsForPicker} calendarStatus={calendarStatus} />
    </>
  );
}
