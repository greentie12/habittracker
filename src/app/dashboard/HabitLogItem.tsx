"use client";

import { useState, useEffect, useTransition } from "react";
import {
  CheckCircle2,
  Circle,
  CircleDashed,
  Flame,
  MoreVertical,
  CalendarX,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  archiveHabitAction,
  deleteHabitPermanentlyAction,
  skipHabitAction,
  toggleHabitAction,
  updateHabitValueAction,
} from "./actions";
import type { HabitForDate } from "@/data/habits";

// ─── Binary habit card ────────────────────────────────────────────────────────

function BinaryHabitLogItem({
  log,
  date,
  onSkip,
  onArchive,
  onDeleteConfirm,
  isPending,
}: {
  log: HabitForDate;
  date: string;
  onSkip: () => void;
  onArchive: () => void;
  onDeleteConfirm: () => void;
  isPending: boolean;
}) {
  const [isToggling, startToggle] = useTransition();

  const fillColor = log.categoryColor ?? "hsl(var(--primary))";
  const [fillWidth, setFillWidth] = useState(log.completed ? 100 : 0);

  // Keep in sync if server state changes (e.g. navigating between dates)
  useEffect(() => {
    setFillWidth(log.completed ? 100 : 0);
  }, [log.completed]);

  function handleClick() {
    setFillWidth(log.completed ? 0 : 100); // animate immediately on click
    startToggle(() => toggleHabitAction(log.id, date));
  }

  return (
    <Card
      onClick={handleClick}
      className={`relative overflow-hidden cursor-pointer select-none ${
        isToggling || isPending ? "opacity-60" : "hover:bg-muted/40"
      }`}
    >
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `${fillWidth}%`,
          backgroundColor: fillColor,
          opacity: 0.18,
          transition: "width 1.5s ease-out",
        }}
      />
      <CardContent className="relative flex items-center gap-3 py-4">
        <div className="shrink-0 flex items-center justify-center size-12 max-[500px]:size-20 text-muted-foreground">
          <div className="transition-transform duration-150 hover:scale-125">
            {log.completed ? (
              <CheckCircle2 className="size-8 max-[500px]:size-16 text-primary" />
            ) : (
              <Circle className="size-8 max-[500px]:size-16" />
            )}
          </div>
        </div>
        <HabitInfo log={log} />
        <StreakBadge streak={log.currentStreak} />
        <HabitMenu onSkip={onSkip} onArchive={onArchive} onDeleteConfirm={onDeleteConfirm} isPending={isPending} />
      </CardContent>
    </Card>
  );
}

// ─── Measurable habit card ────────────────────────────────────────────────────

function MeasurableHabitLogItem({
  log,
  date,
  onSkip,
  onArchive,
  onDeleteConfirm,
  isPending,
}: {
  log: HabitForDate;
  date: string;
  onSkip: () => void;
  onArchive: () => void;
  onDeleteConfirm: () => void;
  isPending: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState(String(log.value ?? 0));
  const [isSaving, startSave] = useTransition();
  const [isCompleting, startComplete] = useTransition();

  const inProgress = !log.completed && (log.value ?? 0) > 0;
  const progress =
    log.targetValue && log.targetValue > 0
      ? Math.min(100, ((log.value ?? 0) / log.targetValue) * 100)
      : 0;
  const fillColor = log.categoryColor ?? "hsl(var(--primary))";

  const [fillWidth, setFillWidth] = useState(log.completed ? 100 : progress);

  useEffect(() => {
    setFillWidth(log.completed ? 100 : progress);
  }, [log.completed, progress]);

  function handleCardClick() {
    setInputValue(String(log.value ?? 0));
    setDialogOpen(true);
  }

  function handleCircleClick(e: React.MouseEvent) {
    e.stopPropagation();
    const completing = !log.completed;
    setFillWidth(completing ? 100 : 0);
    const target = completing ? (log.targetValue ?? 1) : 0;
    startComplete(() => updateHabitValueAction(log.id, date, target));
  }

  function handleSave() {
    const v = Math.max(0, parseInt(inputValue, 10) || 0);
    startSave(async () => {
      await updateHabitValueAction(log.id, date, v);
      setDialogOpen(false);
    });
  }

  function handleClear() {
    startSave(async () => {
      await updateHabitValueAction(log.id, date, 0);
      setDialogOpen(false);
    });
  }

  function adjust(delta: number) {
    setInputValue((prev) => String(Math.max(0, (parseInt(prev, 10) || 0) + delta)));
  }

  const current = parseInt(inputValue, 10) || 0;
  const isAnyPending = isPending || isSaving || isCompleting;

  return (
    <>
      <Card
        onClick={handleCardClick}
        className={`relative overflow-hidden transition-colors cursor-pointer select-none ${
          isAnyPending ? "opacity-60" : "hover:bg-muted/40"
        }`}
      >
        {/* Animated fill */}
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${fillWidth}%`,
            backgroundColor: fillColor,
            opacity: 0.18,
            transition: "width 1.5s ease-out",
          }}
        />
        <CardContent className="relative flex items-center gap-3 py-4">
          <button
            onClick={handleCircleClick}
            disabled={isAnyPending}
            className="shrink-0 flex items-center justify-center size-12 max-[500px]:size-20 rounded-full text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group"
            aria-label={log.completed ? "Mark incomplete" : "Mark complete"}
          >
            <div className="transition-transform duration-150 group-hover:scale-125">
              {log.completed ? (
                <CheckCircle2 className="size-8 max-[500px]:size-16 text-primary" />
              ) : inProgress ? (
                <CircleDashed className="size-8 max-[500px]:size-16 text-primary/60" />
              ) : (
                <Circle className="size-8 max-[500px]:size-16" />
              )}
            </div>
          </button>
          <HabitInfo log={log} />
          <StreakBadge streak={log.currentStreak} />
          <HabitMenu onSkip={onSkip} onArchive={onArchive} onDeleteConfirm={onDeleteConfirm} isPending={isAnyPending} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xs" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{log.habitName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="habit-value">
                {log.targetValue != null
                  ? `Value (target: ${log.targetValue}${log.targetUnit ? ` ${log.targetUnit}` : ""})`
                  : "Value"}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="habit-value"
                  type="number"
                  min="0"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-24"
                  autoFocus
                />
                {log.targetUnit && (
                  <span className="text-sm text-muted-foreground">{log.targetUnit}</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {[1, 2, 5].map((n) => (
                <Button key={n} variant="outline" size="sm" onClick={() => adjust(n)}>
                  +{n}
                </Button>
              ))}
            </div>

            {log.targetValue != null && (
              <p className="text-sm text-muted-foreground">
                {current} / {log.targetValue}
                {log.targetUnit ? ` ${log.targetUnit}` : ""}
                {current >= log.targetValue ? " ✓" : ""}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" disabled={isSaving} onClick={handleSave}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" disabled={isSaving} onClick={handleClear}>
                Clear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function HabitInfo({ log }: { log: HabitForDate }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`font-medium ${log.completed ? "line-through text-muted-foreground" : ""}`}>
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
  );
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  return (
    <div className="flex items-center gap-1 text-sm text-orange-500 shrink-0">
      <Flame className="size-4" />
      <span>{streak}</span>
    </div>
  );
}

function HabitMenu({
  onSkip,
  onArchive,
  onDeleteConfirm,
  isPending,
}: {
  onSkip: () => void;
  onArchive: () => void;
  onDeleteConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 size-7 text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
          disabled={isPending}
          aria-label="Habit options"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onSkip}>
          <CalendarX className="size-4 mr-2" />
          Remove for today
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onArchive} className="text-destructive focus:text-destructive">
          <Trash2 className="size-4 mr-2" />
          Delete habit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDeleteConfirm} className="text-destructive focus:text-destructive">
          <Trash2 className="size-4 mr-2" />
          Delete permanently
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function HabitLogItem({ log, date }: { log: HabitForDate; date: string }) {
  const [isSkipping, startSkip] = useTransition();
  const [isArchiving, startArchive] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isPending = isSkipping || isArchiving || isDeleting;

  const sharedProps = {
    log,
    date,
    isPending,
    onSkip: () => startSkip(() => skipHabitAction(log.id, date)),
    onArchive: () => startArchive(() => archiveHabitAction(log.id)),
    onDeleteConfirm: () => setConfirmDelete(true),
  };

  return (
    <>
      {log.type === "measurable" ? (
        <MeasurableHabitLogItem {...sharedProps} />
      ) : (
        <BinaryHabitLogItem {...sharedProps} />
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{log.habitName}" permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the habit and all its history from the database. It cannot be undone and won't appear anywhere again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => startDelete(() => deleteHabitPermanentlyAction(log.id))}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
