CREATE TYPE "public"."recurrence_type" AS ENUM('NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TABLE "budget_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movements" DROP CONSTRAINT "movements_budget_id_budgets_id_fk";
--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "recurrence" "recurrence_type" DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "movements" ADD COLUMN "period_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bot_pin" varchar(255);--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_period_id_budget_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."budget_periods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "amount";--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "start_date";--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "end_date";--> statement-breakpoint
ALTER TABLE "movements" DROP COLUMN "budget_id";--> statement-breakpoint
ALTER TABLE "movements" DROP COLUMN "category";