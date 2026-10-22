CREATE TYPE "public"."college_stage" AS ENUM('reach_out', 'initial_connect', 'requirements_received', 'rates_proposed', 'locked', 'lost');--> statement-breakpoint
CREATE TYPE "public"."deal_stage" AS ENUM('reach_out', 'initial_connect', 'requirements_received', 'proposal_sent', 'locked', 'lost');--> statement-breakpoint
CREATE TYPE "public"."entry_kind" AS ENUM('item', 'total');--> statement-breakpoint
CREATE TYPE "public"."fest_type" AS ENUM('cultural', 'technical', 'other');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('executive', 'admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."travel_stay" AS ENUM('included', 'extra', 'unknown');--> statement-breakpoint
CREATE TABLE "alert_dispatch" (
	"college_id" integer NOT NULL,
	"fest_year" smallint NOT NULL,
	"kind" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_dispatch_college_id_fest_year_kind_pk" PRIMARY KEY("college_id","fest_year","kind")
);
--> statement-breakpoint
CREATE TABLE "artist_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_id" integer NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"designation" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artist_manual_shows" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_id" integer NOT NULL,
	"college_name" text NOT NULL,
	"year" smallint NOT NULL,
	"event_month" smallint,
	"event_date" date,
	"amount" bigint DEFAULT 0 NOT NULL,
	"travel" "travel_stay" DEFAULT 'unknown' NOT NULL,
	"travel_extra" bigint DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"stage_name" text DEFAULT '' NOT NULL,
	"genre" text DEFAULT '' NOT NULL,
	"last_rate" bigint DEFAULT 0 NOT NULL,
	"last_rate_date" date,
	"crew_count" integer DEFAULT 0 NOT NULL,
	"rider_notes" text DEFAULT '' NOT NULL,
	"tech_rider_url" text DEFAULT '' NOT NULL,
	"hospitality_rider_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer,
	"action" text NOT NULL,
	"target_user_id" integer,
	"detail" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "college_artist_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"college_id" integer NOT NULL,
	"year" smallint NOT NULL,
	"kind" "entry_kind" DEFAULT 'item' NOT NULL,
	"artist_id" integer,
	"artist_name" text DEFAULT '' NOT NULL,
	"genre" text DEFAULT '' NOT NULL,
	"day" smallint DEFAULT 0 NOT NULL,
	"amount" bigint DEFAULT 0 NOT NULL,
	"travel" "travel_stay" DEFAULT 'unknown' NOT NULL,
	"travel_extra" bigint DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "college_assignments" (
	"college_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "college_assignments_college_id_user_id_pk" PRIMARY KEY("college_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "college_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"college_id" integer NOT NULL,
	"text" text NOT NULL,
	"by_user_id" integer,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "college_production_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"college_id" integer NOT NULL,
	"year" smallint NOT NULL,
	"kind" "entry_kind" DEFAULT 'item' NOT NULL,
	"vendor" text DEFAULT '' NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"day" smallint DEFAULT 0 NOT NULL,
	"amount" bigint DEFAULT 0 NOT NULL,
	"travel" "travel_stay" DEFAULT 'unknown' NOT NULL,
	"travel_extra" bigint DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "college_sponsorships" (
	"id" serial PRIMARY KEY NOT NULL,
	"college_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"year" smallint NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"amount" bigint DEFAULT 0 NOT NULL,
	"deliverables" text DEFAULT '' NOT NULL,
	"exclusive" boolean DEFAULT false NOT NULL,
	"event_month" smallint,
	"event_date" date,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "college_stage_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"college_id" integer NOT NULL,
	"from_stage" text NOT NULL,
	"to_stage" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"by_user_id" integer,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "college_years" (
	"id" serial PRIMARY KEY NOT NULL,
	"college_id" integer NOT NULL,
	"year" smallint NOT NULL,
	"agency" text DEFAULT '' NOT NULL,
	"event_month" smallint,
	"start_date" date,
	"end_date" date,
	"days" smallint DEFAULT 2 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "colleges" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"state" text DEFAULT '' NOT NULL,
	"name_key" text NOT NULL,
	"fest_name" text DEFAULT '' NOT NULL,
	"fest_type" "fest_type" DEFAULT 'cultural' NOT NULL,
	"fest_month" smallint NOT NULL,
	"fest_year" smallint NOT NULL,
	"fest_start" date,
	"fest_end" date,
	"days" smallint DEFAULT 2 NOT NULL,
	"stage" "college_stage" DEFAULT 'reach_out' NOT NULL,
	"lost_reason" text DEFAULT '' NOT NULL,
	"convenor_name" text DEFAULT '' NOT NULL,
	"convenor_phone" text DEFAULT '' NOT NULL,
	"faculty_name" text DEFAULT '' NOT NULL,
	"faculty_phone" text DEFAULT '' NOT NULL,
	"artist_budget" bigint DEFAULT 0 NOT NULL,
	"prod_budget" bigint DEFAULT 0 NOT NULL,
	"wishlist" text DEFAULT '' NOT NULL,
	"scope_notes" text DEFAULT '' NOT NULL,
	"proposed_artist_rate" bigint DEFAULT 0 NOT NULL,
	"proposed_prod_rate" bigint DEFAULT 0 NOT NULL,
	"proposal_notes" text DEFAULT '' NOT NULL,
	"deal_amount" bigint DEFAULT 0 NOT NULL,
	"deal_deliverables" text DEFAULT '' NOT NULL,
	"last_touched_at" timestamp with time zone,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"designation" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsor_deal_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"deal_id" integer NOT NULL,
	"from_stage" text NOT NULL,
	"to_stage" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"by_user_id" integer,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsor_deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"college_id" integer,
	"year" smallint,
	"stage" "deal_stage" DEFAULT 'reach_out' NOT NULL,
	"amount" bigint DEFAULT 0 NOT NULL,
	"deliverables" text DEFAULT '' NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"exclusive" boolean DEFAULT false NOT NULL,
	"lost_reason" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'executive' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "alert_dispatch" ADD CONSTRAINT "alert_dispatch_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_contacts" ADD CONSTRAINT "artist_contacts_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_manual_shows" ADD CONSTRAINT "artist_manual_shows_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_artist_entries" ADD CONSTRAINT "college_artist_entries_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_artist_entries" ADD CONSTRAINT "college_artist_entries_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_assignments" ADD CONSTRAINT "college_assignments_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_assignments" ADD CONSTRAINT "college_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_notes" ADD CONSTRAINT "college_notes_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_notes" ADD CONSTRAINT "college_notes_by_user_id_users_id_fk" FOREIGN KEY ("by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_production_entries" ADD CONSTRAINT "college_production_entries_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_sponsorships" ADD CONSTRAINT "college_sponsorships_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_sponsorships" ADD CONSTRAINT "college_sponsorships_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_stage_log" ADD CONSTRAINT "college_stage_log_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_stage_log" ADD CONSTRAINT "college_stage_log_by_user_id_users_id_fk" FOREIGN KEY ("by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_years" ADD CONSTRAINT "college_years_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colleges" ADD CONSTRAINT "colleges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_contacts" ADD CONSTRAINT "company_contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_deal_log" ADD CONSTRAINT "sponsor_deal_log_deal_id_sponsor_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."sponsor_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_deal_log" ADD CONSTRAINT "sponsor_deal_log_by_user_id_users_id_fk" FOREIGN KEY ("by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_deals" ADD CONSTRAINT "sponsor_deals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_deals" ADD CONSTRAINT "sponsor_deals_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_deals" ADD CONSTRAINT "sponsor_deals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artists_name_key_idx" ON "artists" USING btree ("name_key");--> statement-breakpoint
CREATE INDEX "college_artist_entries_artist_idx" ON "college_artist_entries" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "college_artist_entries_college_idx" ON "college_artist_entries" USING btree ("college_id");--> statement-breakpoint
CREATE INDEX "college_production_entries_college_idx" ON "college_production_entries" USING btree ("college_id");--> statement-breakpoint
CREATE INDEX "college_sponsorships_company_idx" ON "college_sponsorships" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "college_sponsorships_college_idx" ON "college_sponsorships" USING btree ("college_id");--> statement-breakpoint
CREATE UNIQUE INDEX "college_years_uq" ON "college_years" USING btree ("college_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "colleges_name_key_idx" ON "colleges" USING btree ("name_key");--> statement-breakpoint
CREATE INDEX "colleges_stage_idx" ON "colleges" USING btree ("stage");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_name_key_idx" ON "companies" USING btree ("name_key");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sponsor_deals_company_idx" ON "sponsor_deals" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "sponsor_deals_college_idx" ON "sponsor_deals" USING btree ("college_id");