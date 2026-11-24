ALTER TABLE "app"."users" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "app"."users" ADD COLUMN "phone_verified_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_key" ON "app"."users" USING btree ("username");
