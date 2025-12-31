CREATE TABLE `account` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `activation` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`name` text,
	`machine_id` text,
	`ip_address` text,
	`user_agent` text,
	`last_seen_at` integer,
	`license_id` text NOT NULL,
	`organization_id` text NOT NULL,
	CONSTRAINT `fk_activation_license_id_license_id_fk` FOREIGN KEY (`license_id`) REFERENCES `license`(`id`) ON DELETE cascade,
	CONSTRAINT `fk_activation_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `customer` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company` text,
	`stripe_customer_id` text,
	`synced_at` integer,
	`organization_id` text NOT NULL,
	CONSTRAINT `fk_customer_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `license` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`key` text NOT NULL UNIQUE,
	`key_created_at` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` integer,
	`activation_limit` integer,
	`disabled_at` integer,
	`disabled_reason` text,
	`disabled_notes` text,
	`stripe_payment_intent_id` text,
	`is_test` integer DEFAULT 0 NOT NULL,
	`product_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`license_policy_id` text,
	CONSTRAINT `fk_license_product_id_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE cascade,
	CONSTRAINT `fk_license_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE cascade,
	CONSTRAINT `fk_license_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade,
	CONSTRAINT `fk_license_license_policy_id_license_policy_id_fk` FOREIGN KEY (`license_policy_id`) REFERENCES `license_policy`(`id`) ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `license_event` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`type` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`data` text,
	`ip_address` text,
	`user_agent` text,
	`license_id` text NOT NULL,
	`organization_id` text NOT NULL,
	CONSTRAINT `fk_license_event_license_id_license_id_fk` FOREIGN KEY (`license_id`) REFERENCES `license`(`id`) ON DELETE cascade,
	CONSTRAINT `fk_license_event_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `license_policy` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`name` text NOT NULL,
	`license_length_days` integer,
	`activation_limit` integer,
	`product_id` text NOT NULL,
	CONSTRAINT `fk_license_policy_product_id_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `membership` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text NOT NULL,
	CONSTRAINT `fk_membership_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade,
	CONSTRAINT `fk_membership_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `organization` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`api_key` text NOT NULL,
	`is_onboarded` integer DEFAULT 0 NOT NULL,
	`stripe_connect_id` text,
	`stripe_access_token` text,
	`stripe_refresh_token` text,
	`stripe_scope` text,
	`stripe_token_type` text,
	`stripe_connected_at` integer,
	`stripe_webhook_secret` text,
	`stripe_webhook_endpoint_id` text
);
--> statement-breakpoint
CREATE TABLE `product` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`stripe_product_id` text,
	`synced_at` integer,
	`organization_id` text NOT NULL,
	CONSTRAINT `fk_product_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `secret_key` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`key` text NOT NULL,
	`name` text,
	`scopes` text DEFAULT '[]',
	`expires_at` integer,
	`last_used_at` integer,
	`organization_id` text NOT NULL,
	CONSTRAINT `fk_secret_key_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	CONSTRAINT `fk_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT 0 NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `activation_licenseId_idx` ON `activation` (`license_id`);--> statement-breakpoint
CREATE INDEX `activation_orgId_idx` ON `activation` (`organization_id`);--> statement-breakpoint
CREATE INDEX `customer_orgId_idx` ON `customer` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_email_org_unique` ON `customer` (`email`,`organization_id`);--> statement-breakpoint
CREATE INDEX `license_orgId_idx` ON `license` (`organization_id`);--> statement-breakpoint
CREATE INDEX `license_productId_idx` ON `license` (`product_id`);--> statement-breakpoint
CREATE INDEX `license_customerId_idx` ON `license` (`customer_id`);--> statement-breakpoint
CREATE INDEX `license_status_idx` ON `license` (`status`);--> statement-breakpoint
CREATE INDEX `license_isTest_idx` ON `license` (`is_test`);--> statement-breakpoint
CREATE INDEX `license_event_licenseId_idx` ON `license_event` (`license_id`);--> statement-breakpoint
CREATE INDEX `license_event_orgId_idx` ON `license_event` (`organization_id`);--> statement-breakpoint
CREATE INDEX `license_event_type_idx` ON `license_event` (`type`);--> statement-breakpoint
CREATE INDEX `license_event_createdAt_idx` ON `license_event` (`created_at`);--> statement-breakpoint
CREATE INDEX `license_policy_productId_idx` ON `license_policy` (`product_id`);--> statement-breakpoint
CREATE INDEX `membership_userId_idx` ON `membership` (`user_id`);--> statement-breakpoint
CREATE INDEX `membership_orgId_idx` ON `membership` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `membership_unique` ON `membership` (`user_id`,`organization_id`);--> statement-breakpoint
CREATE INDEX `product_orgId_idx` ON `product` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_slug_org_unique` ON `product` (`slug`,`organization_id`);--> statement-breakpoint
CREATE INDEX `secret_key_orgId_idx` ON `secret_key` (`organization_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);