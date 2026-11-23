CREATE TABLE "app"."auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"lookup_key" text,
	"credential_hash" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"disabled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."auth_rate_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"bucket" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."learner_merges" (
	"from_learner_id" text PRIMARY KEY NOT NULL,
	"to_user_id" uuid NOT NULL,
	"merged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."mnemonic_pending_registrations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"guest_learner_id" text NOT NULL,
	"phrase_sealed" text NOT NULL,
	"phrase_hash" text NOT NULL,
	"lookup_key" text NOT NULL,
	"salt" text NOT NULL,
	"positions" jsonb NOT NULL,
	"purpose" text DEFAULT 'signup' NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."oauth_states" (
	"state" text PRIMARY KEY NOT NULL,
	"nonce" text NOT NULL,
	"code_verifier_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"user_id" uuid,
	"redirect_to" text DEFAULT '/' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"channel" text NOT NULL,
	"destination" text NOT NULL,
	"purpose" text NOT NULL,
	"code_hash" text NOT NULL,
	"user_id" uuid,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"method" text,
	"device_label" text,
	"ip_prefix" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"display_name" text,
	"email" text,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."auth_identities" ADD CONSTRAINT "auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."learner_merges" ADD CONSTRAINT "learner_merges_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."mnemonic_pending_registrations" ADD CONSTRAINT "mnemonic_pending_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."oauth_states" ADD CONSTRAINT "oauth_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."otp_codes" ADD CONSTRAINT "otp_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_identities_provider_account_key" ON "app"."auth_identities" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_identities_user_provider_key" ON "app"."auth_identities" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "auth_identities_user_idx" ON "app"."auth_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_rate_events_bucket_idx" ON "app"."auth_rate_events" USING btree ("bucket","created_at");--> statement-breakpoint
CREATE INDEX "learner_merges_to_user_idx" ON "app"."learner_merges" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "mnemonic_pending_expires_idx" ON "app"."mnemonic_pending_registrations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "oauth_states_expires_idx" ON "app"."oauth_states" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "otp_codes_destination_idx" ON "app"."otp_codes" USING btree ("destination","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "app"."sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "app"."sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "app"."users" USING btree ("email");