import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  date,
  time,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const habitTypeEnum = pgEnum('habit_type', ['binary', 'measurable']);

export const frequencyTypeEnum = pgEnum('frequency_type', [
  'daily',
  'weekly',
  'monthly',
  'custom',
]);

// Used in the habit_reminders.days array column
export const reminderDayEnum = pgEnum('reminder_day', [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
]);

// ---------------------------------------------------------------------------
// Shared timestamp columns helper (inlined per table for Drizzle compatibility)
// ---------------------------------------------------------------------------

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Clerk's external user ID — used to look up the internal user on every request
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  // IANA timezone string (e.g. "America/New_York") — used when resolving loggedDate
  timezone: text('timezone').notNull().default('UTC'),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// habit_categories
// ---------------------------------------------------------------------------

export const habitCategories = pgTable(
  'habit_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    // Hex color for UI theming (e.g. "#FF6B6B")
    color: text('color'),
    // Icon slug/name from the icon library used by the frontend
    icon: text('icon'),
    ...timestamps,
  },
  (t) => [index('idx_habit_categories_user_id').on(t.userId)],
);

// ---------------------------------------------------------------------------
// habits
// ---------------------------------------------------------------------------

export const habits = pgTable(
  'habits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Nullable — habit remains valid if category is deleted
    categoryId: uuid('category_id').references(() => habitCategories.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    description: text('description'),
    type: habitTypeEnum('type').notNull(),
    frequencyType: frequencyTypeEnum('frequency_type').notNull(),
    // Stores recurrence details for weekly/monthly/custom frequencies.
    // Examples:
    //   weekly:  { "days": [1, 3, 5] }          (0=Sun … 6=Sat)
    //   monthly: { "days": [1, 15] }             (day-of-month)
    //   custom:  { "interval": 2, "unit": "week" }
    frequencyConfig: jsonb('frequency_config'),
    // Only populated when type = 'measurable'
    targetValue: numeric('target_value', { precision: 10, scale: 3 }),
    targetUnit: text('target_unit'),
    // Populated when the user archives the habit; null = active
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    // User-defined ordering within a category/list
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('idx_habits_user_id').on(t.userId),
    // Covering index for the most common query: active habits for a user
    index('idx_habits_user_archived').on(t.userId, t.archivedAt),
    index('idx_habits_category_id').on(t.categoryId),
  ],
);

// ---------------------------------------------------------------------------
// habit_logs
// ---------------------------------------------------------------------------

export const habitLogs = pgTable(
  'habit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    // Denormalized from habits.userId for efficient per-user daily queries
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Calendar date in the user's local timezone — drives streak and completion logic
    loggedDate: date('logged_date').notNull(),
    // Exact UTC timestamp of completion (for analytics / precise ordering)
    completedAt: timestamp('completed_at', { withTimezone: true }),
    // Recorded measurement when habit.type = 'measurable'
    value: numeric('value', { precision: 10, scale: 3 }),
    // Optional journal note attached to this completion
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    // Enforces one log per habit per calendar day
    unique('uq_habit_logs_habit_date').on(t.habitId, t.loggedDate),
    index('idx_habit_logs_habit_date').on(t.habitId, t.loggedDate),
    index('idx_habit_logs_user_date').on(t.userId, t.loggedDate),
  ],
);

// ---------------------------------------------------------------------------
// habit_streaks  (1-to-1 with habits — updated on each log write)
// ---------------------------------------------------------------------------

export const habitStreaks = pgTable(
  'habit_streaks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    currentStreak: integer('current_streak').notNull().default(0),
    longestStreak: integer('longest_streak').notNull().default(0),
    // Last calendar date on which the habit was completed (in user's TZ)
    lastCompletedDate: date('last_completed_date'),
    ...timestamps,
  },
  (t) => [uniqueIndex('idx_habit_streaks_habit_id').on(t.habitId)],
);

// ---------------------------------------------------------------------------
// habit_reminders
// ---------------------------------------------------------------------------

export const habitReminders = pgTable(
  'habit_reminders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    // Local time-of-day for the notification (stored as HH:MM:SS)
    reminderTime: time('reminder_time').notNull(),
    // Which days to fire the reminder; empty array = every day
    days: reminderDayEnum('days').array().notNull().default([]),
    isEnabled: boolean('is_enabled').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index('idx_habit_reminders_habit_id').on(t.habitId),
    index('idx_habit_reminders_habit_enabled').on(t.habitId, t.isEnabled),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  habits: many(habits),
  habitLogs: many(habitLogs),
  habitCategories: many(habitCategories),
}));

export const habitCategoriesRelations = relations(habitCategories, ({ one, many }) => ({
  user: one(users, { fields: [habitCategories.userId], references: [users.id] }),
  habits: many(habits),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, { fields: [habits.userId], references: [users.id] }),
  category: one(habitCategories, {
    fields: [habits.categoryId],
    references: [habitCategories.id],
  }),
  logs: many(habitLogs),
  streak: one(habitStreaks, { fields: [habits.id], references: [habitStreaks.habitId] }),
  reminders: many(habitReminders),
}));

export const habitLogsRelations = relations(habitLogs, ({ one }) => ({
  habit: one(habits, { fields: [habitLogs.habitId], references: [habits.id] }),
  user: one(users, { fields: [habitLogs.userId], references: [users.id] }),
}));

export const habitStreaksRelations = relations(habitStreaks, ({ one }) => ({
  habit: one(habits, { fields: [habitStreaks.habitId], references: [habits.id] }),
}));

export const habitRemindersRelations = relations(habitReminders, ({ one }) => ({
  habit: one(habits, { fields: [habitReminders.habitId], references: [habits.id] }),
}));
