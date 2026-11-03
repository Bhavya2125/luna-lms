CREATE TABLE "data_imports" (
	"name" text PRIMARY KEY NOT NULL,
	"result" text DEFAULT '' NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "colleges" ALTER COLUMN "fest_month" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "colleges" ADD COLUMN "tier" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "colleges" ADD COLUMN "college_type" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "colleges" ADD COLUMN "college_instagram" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "colleges" ADD COLUMN "fest_instagram" text DEFAULT '' NOT NULL;