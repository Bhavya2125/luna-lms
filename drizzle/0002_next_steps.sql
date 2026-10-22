ALTER TABLE "colleges" ADD COLUMN "next_action" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "colleges" ADD COLUMN "next_action_due" date;--> statement-breakpoint
ALTER TABLE "colleges" ADD COLUMN "stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsor_deals" ADD COLUMN "next_action" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsor_deals" ADD COLUMN "next_action_due" date;--> statement-breakpoint
ALTER TABLE "sponsor_deals" ADD COLUMN "stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "colleges" c SET "stage_entered_at" = COALESCE((SELECT max(l."at") FROM "college_stage_log" l WHERE l."college_id" = c."id" AND l."to_stage" = c."stage"::text), c."created_at");--> statement-breakpoint
UPDATE "sponsor_deals" d SET "stage_entered_at" = COALESCE((SELECT max(l."at") FROM "sponsor_deal_log" l WHERE l."deal_id" = d."id" AND l."to_stage" = d."stage"::text), d."created_at");
