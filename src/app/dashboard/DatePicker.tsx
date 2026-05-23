"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getCalendarStatusAction } from "./actions";
import type { CalendarDayStatus } from "@/data/calendar";

// Parse "yyyy-MM-dd" as local midnight (avoids UTC-offset date shifts)
function localDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function DatePicker({
  selected,
  initialStatus,
}: {
  selected: Date;
  initialStatus: Record<string, CalendarDayStatus>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [, startFetch] = useTransition();

  function handleMonthChange(month: Date) {
    startFetch(async () => {
      const next = await getCalendarStatusAction(
        month.getFullYear(),
        month.getMonth() + 1,
      );
      setStatus(next);
    });
  }

  const completeDates = Object.entries(status)
    .filter(([, s]) => s === "complete")
    .map(([d]) => localDate(d));

  const missedDates = Object.entries(status)
    .filter(([, s]) => s === "missed")
    .map(([d]) => localDate(d));

  const futureDates = Object.entries(status)
    .filter(([, s]) => s === "future")
    .map(([d]) => localDate(d));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarIcon className="size-4" />
          <span className="sm:hidden">{format(selected, "MMM d")}</span>
          <span className="hidden sm:inline">{format(selected, "MMMM d, yyyy")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={selected}
          onMonthChange={handleMonthChange}
          modifiers={{
            statusComplete: completeDates,
            statusMissed: missedDates,
            statusFuture: futureDates,
          }}
          modifiersClassNames={{
            statusComplete: "day-status-complete",
            statusMissed: "day-status-missed",
            statusFuture: "day-status-future",
          }}
          className="[--cell-size:--spacing(9)] min-[326px]:[--cell-size:--spacing(11)] sm:[--cell-size:--spacing(10)]"
          onSelect={(d) => {
            if (d) {
              router.push(`/dashboard?date=${format(d, "yyyy-MM-dd")}`);
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
