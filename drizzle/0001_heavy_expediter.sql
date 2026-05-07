ALTER TYPE "public"."draft_status" ADD VALUE 'ready' BEFORE 'published';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "draft_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_drafts" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "post_drafts" ADD COLUMN "group_order" integer;--> statement-breakpoint
ALTER TABLE "post_drafts" ADD COLUMN "trigger_run_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "draft_groups" ADD CONSTRAINT "draft_groups_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_drafts" ADD CONSTRAINT "post_drafts_group_id_draft_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."draft_groups"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_inputs_user_id" ON "content_inputs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_post_drafts_user_id" ON "post_drafts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_post_drafts_user_status" ON "post_drafts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_post_drafts_scheduled_at" ON "post_drafts" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_post_media_draft_id" ON "post_media" USING btree ("post_draft_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_publishing_jobs_draft_id" ON "publishing_jobs" USING btree ("post_draft_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_writing_samples_user_id" ON "writing_samples" USING btree ("user_id");