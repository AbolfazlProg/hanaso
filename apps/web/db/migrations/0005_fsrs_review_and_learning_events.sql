CREATE TABLE "app"."fsrs_cards" (
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"kind" text NOT NULL,
	"wave" integer DEFAULT 1 NOT NULL,
	"enrolled_station" text,
	"context_line_id" text,
	"card" jsonb NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"card_state" integer DEFAULT 0 NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_review_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fsrs_cards_user_id_item_id_pk" PRIMARY KEY("user_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "app"."fsrs_revlogs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"client_review_id" uuid NOT NULL,
	"rating" text NOT NULL,
	"grade" integer NOT NULL,
	"card_before" jsonb NOT NULL,
	"card_after" jsonb NOT NULL,
	"due_after" timestamp with time zone NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."learning_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" text DEFAULT 'client' NOT NULL,
	"quarantined" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "fsrs_cards_due_idx" ON "app"."fsrs_cards" USING btree ("user_id","due");--> statement-breakpoint
CREATE UNIQUE INDEX "fsrs_revlogs_client_review_id_key" ON "app"."fsrs_revlogs" USING btree ("client_review_id");--> statement-breakpoint
CREATE INDEX "fsrs_revlogs_user_idx" ON "app"."fsrs_revlogs" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "fsrs_revlogs_item_idx" ON "app"."fsrs_revlogs" USING btree ("user_id","item_id");--> statement-breakpoint
CREATE INDEX "learning_events_user_idx" ON "app"."learning_events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "learning_events_name_idx" ON "app"."learning_events" USING btree ("name","received_at");--> statement-breakpoint
CREATE INDEX "learning_events_received_idx" ON "app"."learning_events" USING btree ("received_at");