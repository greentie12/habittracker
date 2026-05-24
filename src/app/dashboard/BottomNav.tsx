"use client";

import Link from "next/link";
import { BarChart2, Plus } from "lucide-react";
import { DatePicker } from "./DatePicker";
import { AddExistingHabitDialog } from "./AddExistingHabitDialog";
import type { HabitSummary } from "@/data/habits";
import type { CalendarDayStatus } from "@/data/calendar";

export function BottomNav({
  date,
  archived,
  calendarStatus,
}: {
  date: Date;
  archived: HabitSummary[];
  calendarStatus: Record<string, CalendarDayStatus>;
}) {
  return (
    <nav
      className="hidden max-[500px]:flex fixed bottom-0 inset-x-0 z-50 items-center justify-around bg-background border-t border-border px-2"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))", height: "calc(4rem + env(safe-area-inset-bottom))" }}
    >
      {/* Date picker */}
      <div className="flex flex-col items-center gap-0.5">
        <DatePicker selected={date} initialStatus={calendarStatus} />
      </div>

      {/* Weekly chart */}
      <Link
        href="/dashboard/weekly"
        className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Weekly summary"
      >
        <BarChart2 className="size-6" />
        <span className="text-[10px]">Weekly</span>
      </Link>

      {/* Center FAB — New Habit */}
      <Link
        href="/dashboard/habit/new"
        className="flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-lg -mt-6 hover:bg-primary/90 active:scale-95 transition-all"
        aria-label="Create habit"
      >
        <Plus className="size-7" />
      </Link>

      {/* Add existing habit */}
      <AddExistingHabitDialog archived={archived} bottomNav />
    </nav>
  );
}
