"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTheme } from "next-themes";
import type { DaySummary, HabitWeekRow } from "@/data/weekly";

// ─── Bar chart ────────────────────────────────────────────────────────────────

const COLORS = {
  light: {
    full: "#6366f1",
    mid: "#a5b4fc",
    low: "#c7d2fe",
    future: "#e4e4e7",
    grid: "#e4e4e7",
    tick: "#71717a",
  },
  dark: {
    full: "#818cf8",
    mid: "#4f46e5",
    low: "#312e81",
    future: "#3f3f46",
    grid: "#3f3f46",
    tick: "#a1a1aa",
  },
};

export function CompletionBarChart({ days }: { days: DaySummary[] }) {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === "dark" ? COLORS.dark : COLORS.light;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={days} barSize={32} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} />
        <XAxis
          dataKey="dayLabel"
          tick={{ fontSize: 12, fill: c.tick }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: c.tick }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          formatter={(value, _, props) => {
            const d = props.payload as DaySummary;
            return [`${d.completed} / ${d.scheduled} habits`, `${value}% complete`];
          }}
          labelFormatter={(label, payload) => {
            const d = payload?.[0]?.payload as DaySummary | undefined;
            return d ? `${label} ${d.dayNum}` : label;
          }}
          cursor={false}
          contentStyle={{
            borderRadius: "0.5rem",
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            color: "hsl(var(--popover-foreground))",
            fontSize: 13,
          }}
        />
        <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
          {days.map((day) => (
            <Cell
              key={day.date}
              fill={
                day.isFuture
                  ? c.future
                  : day.rate === 100
                  ? c.full
                  : day.rate >= 50
                  ? c.mid
                  : c.low
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Habit grid ───────────────────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function HabitGrid({
  habitRows,
  days,
}: {
  habitRows: HabitWeekRow[];
  days: DaySummary[];
}) {
  if (habitRows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left font-medium text-muted-foreground py-2 pr-4 min-w-32">
              Habit
            </th>
            {days.map((d, i) => (
              <th
                key={d.date}
                className="text-center font-medium text-muted-foreground py-2 px-1 w-12"
              >
                <div>{DAY_LABELS[i]}</div>
                <div className="text-xs font-normal">{d.dayNum}</div>
              </th>
            ))}
            <th className="text-center font-medium text-muted-foreground py-2 px-2 w-16">
              Rate
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {habitRows.map((row) => {
            const doneDays = row.cells.filter((c) => c.scheduled && c.completed).length;
            const scheduledDays = row.cells.filter((c) => c.scheduled && !c.isFuture).length;
            const rate =
              scheduledDays > 0 ? Math.round((doneDays / scheduledDays) * 100) : null;

            return (
              <tr key={row.habitId}>
                <td className="py-2 pr-4 font-medium truncate max-w-[8rem]">
                  {row.habitName}
                </td>
                {row.cells.map((cell, i) => (
                  <td key={i} className="py-2 px-1 text-center">
                    <span
                      className="inline-flex items-center justify-center size-8 rounded-md text-xs font-semibold"
                      style={{
                        backgroundColor: cell.isFuture
                          ? "hsl(var(--muted))"
                          : !cell.scheduled
                          ? "transparent"
                          : cell.completed
                          ? (row.categoryColor ?? "hsl(var(--primary))") + "55"
                          : cell.partial
                          ? (row.categoryColor ?? "hsl(var(--primary))") + "28"
                          : "hsl(var(--muted))",
                        border: !cell.scheduled ? "none" : "1px solid hsl(var(--border))",
                        color: cell.completed
                          ? "hsl(var(--foreground))"
                          : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {!cell.scheduled
                        ? ""
                        : cell.isFuture
                        ? "·"
                        : cell.completed
                        ? "✓"
                        : cell.partial
                        ? "~"
                        : "·"}
                    </span>
                  </td>
                ))}
                <td className="py-2 px-2 text-center text-muted-foreground">
                  {rate != null ? `${rate}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
