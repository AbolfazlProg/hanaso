CREATE TABLE "app"."learning_object_states" (
	"user_id" text NOT NULL,
	"object_id" text NOT NULL,
	"skill" text NOT NULL,
	"state" text NOT NULL,
	"dimension_stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_object_states_user_id_object_id_pk" PRIMARY KEY("user_id","object_id")
);
--> statement-breakpoint
CREATE TABLE "app"."practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"skill" text NOT NULL,
	"kind" text NOT NULL,
	"scope_key" text NOT NULL,
	"item_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "learning_object_states_user_idx" ON "app"."learning_object_states" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "practice_sessions_user_idx" ON "app"."practice_sessions" USING btree ("user_id","started_at");