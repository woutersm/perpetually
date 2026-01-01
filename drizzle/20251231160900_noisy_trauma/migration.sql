CREATE TABLE `invitation` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`organization_id` text NOT NULL,
	`invited_by` text NOT NULL,
	CONSTRAINT `fk_invitation_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade,
	CONSTRAINT `fk_invitation_invited_by_user_id_fk` FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `organization` ADD `subscription_tier` text DEFAULT 'starter' NOT NULL;--> statement-breakpoint
ALTER TABLE `organization` ADD `subscription_status` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `billing_stripe_customer_id` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `billing_stripe_subscription_id` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `billing_current_period_end` integer;--> statement-breakpoint
ALTER TABLE `organization` ADD `billing_trial_ends_at` integer;--> statement-breakpoint
ALTER TABLE `organization` ADD `branding_enabled` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `organization` ADD `brand_logo` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `brand_accent_color` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `brand_support_email` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `brand_hide_powered_by` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `invitation_orgId_idx` ON `invitation` (`organization_id`);--> statement-breakpoint
CREATE INDEX `invitation_email_idx` ON `invitation` (`email`);--> statement-breakpoint
CREATE INDEX `invitation_token_idx` ON `invitation` (`token`);