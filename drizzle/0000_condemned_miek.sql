CREATE TYPE "public"."frequency_type" AS ENUM('daily', 'weekly', 'monthly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."habit_type" AS ENUM('binary', 'measurable');--> statement-breakpoint
CREATE TYPE "public"."reminder_day" AS ENUM('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat');--> statement-breakpoint
CREATE TABLE "habit_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"icon" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"logged_date" date NOT NULL,
	"completed_at" timestamp with time zone,
	"value" numeric(10, 3),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_habit_logs_habit_date" UNIQUE("habit_id","logged_date")
);
--> statement-breakpoint
CREATE TABLE "habit_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"reminder_time" time NOT NULL,
	"days" "reminder_day"[] DEFAULT '{}' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_streaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_completed_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"type" "habit_type" NOT NULL,
	"frequency_type" "frequency_type" NOT NULL,
	"frequency_config" jsonb,
	"target_value" numeric(10, 3),
	"target_unit" text,
	"archived_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "habit_categories" ADD CONSTRAINT "habit_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_reminders" ADD CONSTRAINT "habit_reminders_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_streaks" ADD CONSTRAINT "habit_streaks_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_category_id_habit_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."habit_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_habit_categories_user_id" ON "habit_categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_habit_logs_habit_date" ON "habit_logs" USING btree ("habit_id","logged_date");--> statement-breakpoint
CREATE INDEX "idx_habit_logs_user_date" ON "habit_logs" USING btree ("user_id","logged_date");--> statement-breakpoint
CREATE INDEX "idx_habit_reminders_habit_id" ON "habit_reminders" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "idx_habit_reminders_habit_enabled" ON "habit_reminders" USING btree ("habit_id","is_enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_habit_streaks_habit_id" ON "habit_streaks" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "idx_habits_user_id" ON "habits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_habits_user_archived" ON "habits" USING btree ("user_id","archived_at");--> statement-breakpoint
CREATE INDEX "idx_habits_category_id" ON "habits" USING btree ("category_id");