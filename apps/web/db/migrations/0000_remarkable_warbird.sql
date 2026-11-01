CREATE SCHEMA "content";
--> statement-breakpoint
CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TABLE "content"."audio_assets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"line_id" uuid NOT NULL,
	"speaker" text NOT NULL,
	"character_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"format" text NOT NULL,
	"bitrate" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"lufs" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."characters" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"name_ja" text NOT NULL,
	"name_fa" text NOT NULL,
	"description_fa" text NOT NULL,
	"voice_profile" text NOT NULL,
	"voice_family" text,
	"color_token" text NOT NULL,
	"illustration_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."comprehension_banks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"dialogue_id" uuid NOT NULL,
	"measure" text NOT NULL,
	"line_ref" uuid,
	"knowledge_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."dialogue_lines" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"dialogue_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"speaker_character_id" uuid NOT NULL,
	"sentence_id" uuid NOT NULL,
	"decision_point" jsonb,
	"gap_after_ms" integer,
	"voice_override" text,
	"emotion_tag" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."dialogue_scenes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"dialogue_id" uuid NOT NULL,
	"frame_key" text NOT NULL,
	"speaker_character_id" uuid,
	"illustration_ref" text NOT NULL,
	"camera_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."dialogues" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"title_fa" text NOT NULL,
	"situation_fa" text NOT NULL,
	"jlpt" text NOT NULL,
	"scene_ref" text,
	"unit_order" integer,
	"turn_gap_default_ms" integer DEFAULT 300 NOT NULL,
	"series_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."grammar_points" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"pattern" text NOT NULL,
	"title_fa" text NOT NULL,
	"structure" text NOT NULL,
	"explanation_fa" text NOT NULL,
	"register_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"similar_to" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"first_seen_line_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."learning_objectives" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"code" text NOT NULL,
	"kind" text NOT NULL,
	"title_fa" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."lesson_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"item_type" text NOT NULL,
	"item_id" uuid NOT NULL,
	"role" text NOT NULL,
	"source_dialogue_line_id" uuid,
	"objective_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."lesson_sections" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"section_kind" text NOT NULL,
	"objective_id" uuid,
	"line_refs" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"content" jsonb NOT NULL,
	"mastery_threshold" real DEFAULT 0.7 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."lessons" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"unit_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title_fa" text NOT NULL,
	"type" text NOT NULL,
	"stage" integer NOT NULL,
	"jlpt" text,
	"est_minutes" integer,
	"prerequisite_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"order" integer NOT NULL,
	"dialogue_id" uuid,
	"unit_stage" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content"."vocab_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"term" text NOT NULL,
	"reading_kana" text NOT NULL,
	"reading_romaji" text,
	"meanings_fa" jsonb NOT NULL,
	"pitch_mora" smallint,
	"jlpt" text,
	"is_common" boolean DEFAULT false NOT NULL,
	"freq_rank" integer,
	"first_seen_line_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."dialogue_mastery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"dialogue_id" uuid NOT NULL,
	"revision_id" uuid,
	"attempt_no" integer NOT NULL,
	"scores" jsonb NOT NULL,
	"weak_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."lesson_progress" (
	"user_id" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"dialogue_id" uuid,
	"current_step" text,
	"unit_stage" text DEFAULT 'A_selfcheck' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"mastery_attempt_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
ALTER TABLE "content"."audio_assets" ADD CONSTRAINT "audio_assets_line_id_dialogue_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "content"."dialogue_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."audio_assets" ADD CONSTRAINT "audio_assets_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "content"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."comprehension_banks" ADD CONSTRAINT "comprehension_banks_dialogue_id_dialogues_id_fk" FOREIGN KEY ("dialogue_id") REFERENCES "content"."dialogues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."dialogue_lines" ADD CONSTRAINT "dialogue_lines_dialogue_id_dialogues_id_fk" FOREIGN KEY ("dialogue_id") REFERENCES "content"."dialogues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."dialogue_lines" ADD CONSTRAINT "dialogue_lines_speaker_character_id_characters_id_fk" FOREIGN KEY ("speaker_character_id") REFERENCES "content"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."dialogue_scenes" ADD CONSTRAINT "dialogue_scenes_dialogue_id_dialogues_id_fk" FOREIGN KEY ("dialogue_id") REFERENCES "content"."dialogues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."dialogue_scenes" ADD CONSTRAINT "dialogue_scenes_speaker_character_id_characters_id_fk" FOREIGN KEY ("speaker_character_id") REFERENCES "content"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."lesson_items" ADD CONSTRAINT "lesson_items_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "content"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."lesson_items" ADD CONSTRAINT "lesson_items_objective_id_learning_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "content"."learning_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."lesson_sections" ADD CONSTRAINT "lesson_sections_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "content"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."lesson_sections" ADD CONSTRAINT "lesson_sections_objective_id_learning_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "content"."learning_objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content"."lessons" ADD CONSTRAINT "lessons_dialogue_id_dialogues_id_fk" FOREIGN KEY ("dialogue_id") REFERENCES "content"."dialogues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."dialogue_mastery_attempts" ADD CONSTRAINT "dialogue_mastery_attempts_dialogue_id_dialogues_id_fk" FOREIGN KEY ("dialogue_id") REFERENCES "content"."dialogues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "content"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."lesson_progress" ADD CONSTRAINT "lesson_progress_dialogue_id_dialogues_id_fk" FOREIGN KEY ("dialogue_id") REFERENCES "content"."dialogues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audio_assets_line_speaker_format_version_key" ON "content"."audio_assets" USING btree ("line_id","speaker","format","version");--> statement-breakpoint
CREATE UNIQUE INDEX "audio_assets_hash_key" ON "content"."audio_assets" USING btree ("hash");--> statement-breakpoint
CREATE UNIQUE INDEX "characters_slug_key" ON "content"."characters" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "comprehension_banks_dialogue_id_measure_idx" ON "content"."comprehension_banks" USING btree ("dialogue_id","measure");--> statement-breakpoint
CREATE UNIQUE INDEX "dialogue_lines_dialogue_id_order_key" ON "content"."dialogue_lines" USING btree ("dialogue_id","order");--> statement-breakpoint
CREATE INDEX "dialogue_scenes_dialogue_id_idx" ON "content"."dialogue_scenes" USING btree ("dialogue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dialogues_slug_key" ON "content"."dialogues" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "grammar_points_pattern_key" ON "content"."grammar_points" USING btree ("pattern");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_objectives_code_key" ON "content"."learning_objectives" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_items_lesson_id_order_key" ON "content"."lesson_items" USING btree ("lesson_id","order");--> statement-breakpoint
CREATE INDEX "lesson_items_item_type_item_id_idx" ON "content"."lesson_items" USING btree ("item_type","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_sections_lesson_id_order_key" ON "content"."lesson_sections" USING btree ("lesson_id","order");--> statement-breakpoint
CREATE INDEX "lesson_sections_objective_id_idx" ON "content"."lesson_sections" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "lessons_unit_id_order_idx" ON "content"."lessons" USING btree ("unit_id","order");--> statement-breakpoint
CREATE UNIQUE INDEX "vocab_items_term_reading_kana_key" ON "content"."vocab_items" USING btree ("term","reading_kana");--> statement-breakpoint
CREATE UNIQUE INDEX "dialogue_mastery_attempts_user_dialogue_no_key" ON "app"."dialogue_mastery_attempts" USING btree ("user_id","dialogue_id","attempt_no");--> statement-breakpoint
CREATE INDEX "dialogue_mastery_attempts_dialogue_idx" ON "app"."dialogue_mastery_attempts" USING btree ("dialogue_id");--> statement-breakpoint
CREATE INDEX "lesson_progress_user_dialogue_idx" ON "app"."lesson_progress" USING btree ("user_id","dialogue_id");