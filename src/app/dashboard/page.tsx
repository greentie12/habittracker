"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, Circle, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type HabitType = "binary" | "measurable";

interface HabitLog {
  id: string;
  habitName: string;
  type: HabitType;
  categoryName: string;
  categoryColor: string;
  completed: boolean;
  value?: number;
  targetValue?: number;
  targetUnit?: string;
  currentStreak: number;
  notes?: string;
}

const PLACEHOLDER_LOGS: HabitLog[] = [
  {
    id: "1",
    habitName: "Morning Run",
    type: "measurable",
    categoryName: "Fitness",
    categoryColor: "#4ADE80",
    completed: true,
    value: 5,
    targetValue: 5,
    targetUnit: "km",
    currentStreak: 7,
  },
  {
    id: "2",
    habitName: "Read",
    type: "measurable",
    categoryName: "Learning",
    categoryColor: "#60A5FA",
    completed: false,
    value: 15,
    targetValue: 30,
    targetUnit: "min",
    currentStreak: 3,
  },
  {
    id: "3",
    habitName: "Meditate",
    type: "binary",
    categoryName: "Mindfulness",
    categoryColor: "#C084FC",
    completed: true,
    currentStreak: 12,
    notes: "10-minute body scan",
  },
  {
    id: "4",
    habitName: "Drink Water",
    type: "measurable",
    categoryName: "Health",
    categoryColor: "#FB923C",
    completed: false,
    value: 4,
    targetValue: 8,
    targetUnit: "glasses",
    currentStreak: 0,
  },
  {
    id: "5",
    habitName: "No Social Media",
    type: "binary",
    categoryName: "Focus",
    categoryColor: "#F87171",
    completed: false,
    currentStreak: 1,
  },
];

function HabitLogItem({ log }: { log: HabitLog }) {
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
            <Badge
              variant="secondary"
              className="text-xs shrink-0"
              style={{ borderLeft: `3px solid ${log.categoryColor}` }}
            >
              {log.categoryName}
            </Badge>
          </div>

          {log.type === "measurable" && log.targetValue !== undefined && (
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

export default function DashboardPage() {
  const [date, setDate] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);

  const completed = PLACEHOLDER_LOGS.filter((l) => l.completed).length;
  const total = PLACEHOLDER_LOGS.length;

  return (
    <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="size-4" />
              {format(date, "MMMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (d) {
                  setDate(d);
                  setOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
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
        {PLACEHOLDER_LOGS.length > 0 ? (
          PLACEHOLDER_LOGS.map((log) => <HabitLogItem key={log.id} log={log} />)
        ) : (
          <p className="text-center text-muted-foreground py-12">
            No habits logged for this date.
          </p>
        )}
      </div>
    </main>
  );
}
