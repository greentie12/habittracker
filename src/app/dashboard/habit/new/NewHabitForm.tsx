"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { createHabitAction } from "./actions";
import type { HabitCategory } from "@/data/habits";

const WEEK_DAYS = [
  { label: "Su", value: 0 },
  { label: "Mo", value: 1 },
  { label: "Tu", value: 2 },
  { label: "We", value: 3 },
  { label: "Th", value: 4 },
  { label: "Fr", value: 5 },
  { label: "Sa", value: 6 },
];

type Consistency = "daily" | "weekly" | "monthly" | "none";

interface Props {
  categories: HabitCategory[];
}

function placementLabel(consistency: Consistency): string {
  if (consistency === "daily") return "Add for today";
  if (consistency === "weekly") return "Add for this week";
  if (consistency === "monthly") return "Add for this month";
  return "Create habit";
}

export default function NewHabitForm({ categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"binary" | "measurable">("binary");
  const [consistency, setConsistency] = useState<Consistency>("daily");
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);
  const [monthDay, setMonthDay] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [targetValue, setTargetValue] = useState("");
  const [targetUnit, setTargetUnit] = useState("");

  function toggleWeekDay(day: number) {
    setSelectedWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function buildFrequencyConfig(): { days: number[] } | null {
    if (consistency === "weekly") return { days: selectedWeekDays };
    if (consistency === "monthly" && monthDay) return { days: [Number(monthDay)] };
    return null;
  }

  function handleSubmit(saveToLibrary: boolean) {
    setError(null);

    if (consistency === "weekly" && selectedWeekDays.length === 0) {
      setError("Please select at least one day of the week.");
      return;
    }
    if (consistency === "monthly" && !monthDay) {
      setError("Please enter a day of the month.");
      return;
    }

    startTransition(async () => {
      const result = await createHabitAction({
        name,
        description: description || null,
        type,
        consistency,
        frequencyConfig: buildFrequencyConfig(),
        categoryId: categoryId || null,
        targetValue: targetValue ? Number(targetValue) : null,
        targetUnit: targetUnit || null,
        saveToLibrary,
      });

      if (result && !result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning run"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "binary" | "measurable")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="binary">Binary (done / not done)</SelectItem>
                  <SelectItem value="measurable">Measurable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Consistency</Label>
              <Select
                value={consistency}
                onValueChange={(v) => {
                  setConsistency(v as Consistency);
                  setSelectedWeekDays([]);
                  setMonthDay("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {consistency === "weekly" && (
            <div className="space-y-1.5">
              <Label>Days of the week</Label>
              <div className="flex gap-1.5 flex-wrap">
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

          {consistency === "monthly" && (
            <div className="space-y-1.5">
              <Label htmlFor="monthDay">Day of the month (1–31)</Label>
              <Input
                id="monthDay"
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

          {type === "measurable" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="targetValue">Target value</Label>
                <Input
                  id="targetValue"
                  type="number"
                  min="0"
                  step="any"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="e.g. 30"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="targetUnit">Unit</Label>
                <Input
                  id="targetUnit"
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  placeholder="e.g. minutes"
                />
              </div>
            </div>
          )}

          {categories.length > 0 && (
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={categoryId || "none"}
                onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Placement */}
          <div className="space-y-2 pt-1">
            {consistency !== "none" ? (
              <div className="flex gap-3">
                <Button
                  type="button"
                  disabled={isPending || !name.trim()}
                  className="flex-1"
                  onClick={() => handleSubmit(false)}
                >
                  {isPending ? "Creating…" : placementLabel(consistency)}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending || !name.trim()}
                  onClick={() => handleSubmit(true)}
                >
                  Just create it
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                disabled={isPending || !name.trim()}
                className="w-full"
                onClick={() => handleSubmit(true)}
              >
                {isPending ? "Creating…" : "Create habit"}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
