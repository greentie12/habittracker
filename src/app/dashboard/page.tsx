import { format, parseISO } from "date-fns";
import { CheckCircle2, Circle, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "./DatePicker";
import { getHabitsForDate, type HabitForDate } from "@/data/habits";

function HabitLogItem({ log }: { log: HabitForDate }) {
  return (
    <Card className="transition-colors hover:bg-muted/40">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="shrink-0 text-muted-foreground">
          {log.completed ? (
            <CheckCircle2 className="size-5 text-primary" />
          ) : (
            <Circle className="size-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-medium ${log.completed ? "line-through text-muted-foreground" : ""}`}
            >
              {log.habitName}
            </span>
            {log.categoryName && (
              <Badge
                variant="secondary"
                className="text-xs shrink-0"
                style={{ borderLeft: `3px solid ${log.categoryColor ?? "#888"}` }}
              >
                {log.categoryName}
              </Badge>
            )}
          </div>

          {log.type === "measurable" && log.targetValue !== null && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {log.value ?? 0} / {log.targetValue} {log.targetUnit}
            </p>
          )}

          {log.notes && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.notes}</p>
          )}
        </div>

        {log.currentStreak > 0 && (
          <div className="flex items-center gap-1 text-sm text-orange-500 shrink-0">
            <Flame className="size-4" />
            <span>{log.currentStreak}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam ? parseISO(dateParam) : new Date();
  const dateStr = format(date, "yyyy-MM-dd");

  const logs = await getHabitsForDate(dateStr);
  const completed = logs.filter((l) => l.completed).length;
  const total = logs.length;

  return (
    <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <DatePicker selected={date} />
      </div>

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
          logs.map((log) => <HabitLogItem key={log.id} log={log} />)
        ) : (
          <p className="text-center text-muted-foreground py-12">
            No habits logged for this date.
          </p>
        )}
      </div>
    </main>
  );
}
