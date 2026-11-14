CREATE TABLE "content"."levels" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"code" text NOT NULL,
	"title_fa" text NOT NULL,
	"jlpt_label" text,
	"cefr_label" text,
	"can_do_fa" text,
	"order_in_course" integer NOT NULL,
	"policy" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."units" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"level_id" uuid NOT NULL,
	"title_fa" text NOT NULL,
	"can_do_fa" text NOT NULL,
	"summary_fa" text NOT NULL,
	"dialogue_id" uuid NOT NULL,
	"order_in_level" integer NOT NULL,
	"est_minutes" integer NOT NULL,
	"est_load" text NOT NULL,
	"band_arc" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."chapter_progress" (
	"user_id" text NOT NULL,
	"unit_id" uuid NOT NULL,
	"status" text DEFAULT 'started' NOT NULL,
	"best_weighted" real,
	"best_measures" jsonb,
	"mastery_attempt_id" uuid,
	"remediation_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapter_progress_user_id_unit_id_pk" PRIMARY KEY("user_id","unit_id")
);
--> statement-breakpoint
CREATE TABLE "app"."station_progress" (
	"user_id" text NOT NULL,
	"station_id" uuid NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"best_score" real,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"current_block" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "station_progress_user_id_station_id_pk" PRIMARY KEY("user_id","station_id")
);
--> statement-breakpoint
ALTER TABLE "content"."lessons" ADD COLUMN "core" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "content"."lessons" ADD COLUMN "line_refs" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "content"."lessons" ADD COLUMN "objective_code" text;--> statement-breakpoint
ALTER TABLE "content"."lessons" ADD COLUMN "est_load" text;--> statement-breakpoint
ALTER TABLE "content"."lessons" ADD COLUMN "completion_criteria" jsonb;--> statement-breakpoint
ALTER TABLE "content"."lessons" ADD COLUMN "mastery_criteria" jsonb;--> statement-breakpoint
ALTER TABLE "content"."units" ADD CONSTRAINT "units_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "content"."levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."units" ADD CONSTRAINT "units_dialogue_id_dialogues_id_fk" FOREIGN KEY ("dialogue_id") REFERENCES "content"."dialogues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."chapter_progress" ADD CONSTRAINT "chapter_progress_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "content"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."station_progress" ADD CONSTRAINT "station_progress_station_id_lessons_id_fk" FOREIGN KEY ("station_id") REFERENCES "content"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "levels_code_key" ON "content"."levels" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "units_slug_key" ON "content"."units" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "units_dialogue_id_key" ON "content"."units" USING btree ("dialogue_id");--> statement-breakpoint
CREATE INDEX "units_level_order_idx" ON "content"."units" USING btree ("level_id","order_in_level");--> statement-breakpoint
CREATE INDEX "chapter_progress_user_idx" ON "app"."chapter_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "station_progress_user_idx" ON "app"."station_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lessons_type_idx" ON "content"."lessons" USING btree ("type");