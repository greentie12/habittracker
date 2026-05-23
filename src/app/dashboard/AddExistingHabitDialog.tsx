"use client";

import { useState, useTransition } from "react";
import { Plus, ChevronLeft, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteHabitPermanentlyAction, reactivateHabitAction } from "./actions";
import type { HabitSummary } from "@/data/habits";

const WEEK_DAYS = [
  { label: "Su", value: 0 },
  { label: "Mo", value: 1 },
  { label: "Tu", value: 2 },
  { label: "We", value: 3 },
  { label: "Th", value: 4 },
  { label: "Fr", value: 5 },
  { label: "Sa", value: 6 },
];

type FrequencyType = "daily" | "weekly" | "monthly" | "custom";

interface Props {
  archived: HabitSummary[];
  bottomNav?: boolean;
}

export function AddExistingHabitDialog({ archived, bottomNav }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<HabitSummary | null>(null);
  const [frequencyType, setFrequencyType] = useState<FrequencyType>("daily");
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);
  const [monthDay, setMonthDay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localArchived, setLocalArchived] = useState<HabitSummary[]>(archived);
  const [confirmDelete, setConfirmDelete] = useState<HabitSummary | null>(null);
  const [isDeleting, startDelete] = useTransition();

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) resetState();
  }

  function resetState() {
    setSelected(null);
    setFrequencyType("daily");
    setSelectedWeekDays([]);
    setMonthDay("");
    setError(null);
  }

  function handleSelectHabit(habit: HabitSummary) {
    setSelected(habit);
    setFrequencyType("daily");
    setSelectedWeekDays([]);
    setMonthDay("");
    setError(null);
  }

  function toggleWeekDay(day: number) {
    setSelectedWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function buildFrequencyConfig(): { days: number[] } | null {
    if (frequencyType === "weekly") return { days: selectedWeekDays };
    if (frequencyType === "monthly" && monthDay) return { days: [Number(monthDay)] };
    return null;
  }

  function handleConfirm() {
    if (!selected) return;
    if (frequencyType === "weekly" && selectedWeekDays.length === 0) {
      setError("Select at least one day of the week.");
      return;
    }
    if (frequencyType === "monthly" && !monthDay) {
      setError("Enter a day of the month.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await reactivateHabitAction(selected.id, frequencyType, buildFrequencyConfig());
      setOpen(false);
      resetState();
    });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {bottomNav ? (
          <button
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Add existing habit"
          >
            <Plus className="size-6" />
            <span className="text-[10px]">Add Habit</span>
          </button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            Add Habit
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selected ? (
              <button
                className="flex items-center gap-1 text-sm font-normal text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setSelected(null)}
              >
                <ChevronLeft className="size-4" />
                Back
              </button>
            ) : null}
            <span className="block mt-1">
              {selected ? selected.name : "Add Habit"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: pick a habit */}
        {!selected && (
          <>
            {localArchived.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No habits yet. Create one with the Create Habit button.
              </p>
            ) : (
              <div className="divide-y max-h-80 overflow-y-auto">
                {localArchived.map((h) => (
                  <div key={h.id} className="flex items-center gap-1 py-1">
                    {h.isActive ? (
                      /* Active habit — not re-addable, shown for reference */
                      <div className="flex-1 flex items-center gap-3 py-2 px-1 min-w-0 opacity-60 cursor-default select-none">
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="font-medium truncate">{h.name}</span>
                          {h.categoryName && (
                            <Badge
                              variant="secondary"
                              className="text-xs shrink-0"
                              style={{ borderLeft: `3px solid ${h.categoryColor ?? "#888"}` }}
                            >
                              {h.categoryName}
                            </Badge>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <CheckCircle2 className="size-3.5" />
                          Active
                        </span>
                      </div>
                    ) : (
                      /* Archived habit — clickable to re-add */
                      <button
                        className="flex-1 flex items-center gap-3 py-2 px-1 text-left hover:bg-muted/50 rounded transition-colors min-w-0"
                        onClick={() => handleSelectHabit(h)}
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="font-medium truncate">{h.name}</span>
                          {h.categoryName && (
                            <Badge
                              variant="secondary"
                              className="text-xs shrink-0"
                              style={{ borderLeft: `3px solid ${h.categoryColor ?? "#888"}` }}
                            >
                              {h.categoryName}
                            </Badge>
                          )}
                        </div>
                        <ChevronLeft className="size-4 rotate-180 text-muted-foreground shrink-0" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(h); }}
                      className="p-2 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      aria-label={`Delete ${h.name} permanently`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Step 2: choose frequency */}
        {selected && (
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select
                value={frequencyType}
                onValueChange={(v) => {
                  setFrequencyType(v as FrequencyType);
                  setSelectedWeekDays([]);
                  setMonthDay("");
                  setError(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {frequencyType === "weekly" && (
              <div className="space-y-1.5">
                <Label>Days of the week</Label>
                <div className="flex gap-1.5">
                  {WEEK_DAYS.map((d) => (
                    <Button
                      key={d.value}
                      type="button"
                      size="sm"
                      variant={selectedWeekDays.includes(d.value) ? "default" : "outline"}
                      className="w-10 px-0"
                      onClick={() => toggleWeekDay(d.value)}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {frequencyType === "monthly" && (
              <div className="space-y-1.5">
                <Label>Day of the month (1–31)</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={monthDay}
                  onChange={(e) => setMonthDay(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-32"
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button className="w-full" disabled={isPending} onClick={handleConfirm}>
              {isPending ? "Adding…" : "Add to schedule"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{confirmDelete?.name}" permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the habit and all its history from the database. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
            onClick={() => {
              if (!confirmDelete) return;
              const id = confirmDelete.id;
              startDelete(async () => {
                await deleteHabitPermanentlyAction(id);
                setLocalArchived((prev) => prev.filter((h) => h.id !== id));
                setConfirmDelete(null);
              });
            }}
          >
            {isDeleting ? "Deleting…" : "Delete permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
