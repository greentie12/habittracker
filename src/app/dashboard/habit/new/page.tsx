import { getCategories } from "@/data/habits";
import NewHabitForm from "./NewHabitForm";

export default async function NewHabitPage() {
  const categories = await getCategories();

  return (
    <main className="flex-1 p-4 sm:p-6 max-w-xl mx-auto w-full">
      <h1 className="text-2xl font-semibold mb-6">Create Habit</h1>
      <NewHabitForm categories={categories} />
    </main>
  );
}
