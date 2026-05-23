import Link from "next/link";
import { format, addDays, subDays, parseISO, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWeeklySummary } from "@/data/weekly";
import { CompletionBarChart, HabitGrid } from "./WeeklyChart";

function getWeekStart(dateParam?: string): string {
  const base = dateParam ? parseISO(dateParam) : new Date();
  // Monday = weekStartsOn: 1
  return format(startOfWeek(base, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekStart = getWeekStart(week);
  const weekEnd = format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd");
  const prevWeek = format(subDays(parseISO(weekStart), 7), "yyyy-MM-dd");
  const nextWeek = format(addDays(parseISO(weekStart), 7), "yyyy-MM-dd");
  const thisWeek = getWeekStart();

  const summary = await getWeeklySummary(weekStart);

  const weekLabel = `${format(parseISO(weekStart), "MMM d")} – ${format(parseISO(weekEnd), "MMM d, yyyy")}`;

  return (
    <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Weekly Summary</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/dashboard/weekly?week=${prevWeek}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          {weekStart !== thisWeek && (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/weekly">This week</Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon">
            <Link href={`/dashboard/weekly?week=${nextWeek}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Overall stat */}
      <Card className="mb-4">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm text-muted-foreground">Overall completion</p>
            <p className="text-3xl font-bold mt-0.5">{summary.overallRate}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Habits tracked</p>
            <p className="text-3xl font-bold mt-0.5">{summary.habitRows.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Bar chart */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Daily completion</CardTitle>
        </CardHeader>
        <CardContent>
          <CompletionBarChart days={summary.days} />
        </CardContent>
      </Card>

      {/* Habit grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Habit breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.habitRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No habits tracked this week.
            </p>
          ) : (
            <HabitGrid habitRows={summary.habitRows} days={summary.days} />
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">← Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
