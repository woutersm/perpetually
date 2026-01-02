CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"machine_id" text,
	"ip_address" text,
	"user_agent" text,
	"last_seen_at" timestamp with time zone,
	"license_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"stripe_customer_id" text,
	"synced_at" timestamp with time zone,
	"organization_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"token" text NOT NULL UNIQUE,
	"expires_at" timestamp with time zone NOT NULL,
	"organization_id" uuid NOT NULL,
	"invited_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "license" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"key" text NOT NULL UNIQUE,
	"key_created_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"activation_limit" integer,
	"disabled_at" timestamp with time zone,
	"disabled_reason" text,
	"disabled_notes" text,
	"stripe_payment_intent_id" text,
	"is_test" boolean DEFAULT false NOT NULL,
	"expiry_notified_7days_at" timestamp with time zone,
	"expiry_notified_1day_at" timestamp with time zone,
	"expiry_notified_expired_at" timestamp with time zone,
	"product_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"license_policy_id" uuid
);
--> statement-breakpoint
CREATE TABLE "license_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"data" jsonb,
	"ip_address" text,
	"user_agent" text,
	"license_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "license_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"license_length_days" integer,
	"activation_limit" integer,
	"product_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"api_key" text NOT NULL,
	"is_onboarded" boolean DEFAULT false NOT NULL,
	"stripe_connect_id" text,
	"stripe_access_token" text,
	"stripe_refresh_token" text,
	"stripe_scope" text,
	"stripe_token_type" text,
	"stripe_connected_at" timestamp with time zone,
	"stripe_webhook_secret" text,
	"stripe_webhook_endpoint_id" text,
	"subscription_tier" text DEFAULT 'starter' NOT NULL,
	"subscription_status" text,
	"billing_stripe_customer_id" text,
	"billing_stripe_subscription_id" text,
	"billing_current_period_end" timestamp with time zone,
	"billing_trial_ends_at" timestamp with time zone,
	"branding_enabled" boolean DEFAULT false NOT NULL,
	"brand_logo" text,
	"brand_accent_color" text,
	"brand_support_email" text,
	"brand_hide_powered_by" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"stripe_product_id" text,
	"synced_at" timestamp with time zone,
	"organization_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secret_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"key" text NOT NULL,
	"name" text,
	"scopes" jsonb DEFAULT '[]',
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"organization_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "activation_licenseId_idx" ON "activation" ("license_id");--> statement-breakpoint
CREATE INDEX "activation_orgId_idx" ON "activation" ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_orgId_idx" ON "customer" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_email_org_unique" ON "customer" ("email","organization_id");--> statement-breakpoint
CREATE INDEX "invitation_orgId_idx" ON "invitation" ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" ("email");--> statement-breakpoint
CREATE INDEX "invitation_token_idx" ON "invitation" ("token");--> statement-breakpoint
CREATE INDEX "license_orgId_idx" ON "license" ("organization_id");--> statement-breakpoint
CREATE INDEX "license_productId_idx" ON "license" ("product_id");--> statement-breakpoint
CREATE INDEX "license_customerId_idx" ON "license" ("customer_id");--> statement-breakpoint
CREATE INDEX "license_status_idx" ON "license" ("status");--> statement-breakpoint
CREATE INDEX "license_isTest_idx" ON "license" ("is_test");--> statement-breakpoint
CREATE INDEX "license_event_licenseId_idx" ON "license_event" ("license_id");--> statement-breakpoint
CREATE INDEX "license_event_orgId_idx" ON "license_event" ("organization_id");--> statement-breakpoint
CREATE INDEX "license_event_type_idx" ON "license_event" ("type");--> statement-breakpoint
CREATE INDEX "license_event_createdAt_idx" ON "license_event" ("created_at");--> statement-breakpoint
CREATE INDEX "license_policy_productId_idx" ON "license_policy" ("product_id");--> statement-breakpoint
CREATE INDEX "membership_userId_idx" ON "membership" ("user_id");--> statement-breakpoint
CREATE INDEX "membership_orgId_idx" ON "membership" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_unique" ON "membership" ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "product_orgId_idx" ON "product" ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_slug_org_unique" ON "product" ("slug","organization_id");--> statement-breakpoint
CREATE INDEX "secret_key_orgId_idx" ON "secret_key" ("organization_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "activation" ADD CONSTRAINT "activation_license_id_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "license"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "activation" ADD CONSTRAINT "activation_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invited_by_user_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "license" ADD CONSTRAINT "license_product_id_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "license" ADD CONSTRAINT "license_customer_id_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "license" ADD CONSTRAINT "license_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "license" ADD CONSTRAINT "license_license_policy_id_license_policy_id_fkey" FOREIGN KEY ("license_policy_id") REFERENCES "license_policy"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "license_event" ADD CONSTRAINT "license_event_license_id_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "license"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "license_event" ADD CONSTRAINT "license_event_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "license_policy" ADD CONSTRAINT "license_policy_product_id_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "secret_key" ADD CONSTRAINT "secret_key_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;