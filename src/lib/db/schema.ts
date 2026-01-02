import { defineRelations } from "drizzle-orm";
import {
  text,
  integer,
  pgTable,
  uniqueIndex,
  index,
  uuid,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

// ==================== BETTER-AUTH TABLES ====================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_userId_idx").on(table.userId),
  ]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("account_userId_idx").on(table.userId),
  ]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
  ]
);

// ==================== ORGANIZATION (Multi-tenancy) ====================

export const organization = pgTable("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),

  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),

  // Public API key for client-side license validation
  apiKey: text("api_key").notNull(),

  // Onboarding state
  isOnboarded: boolean("is_onboarded").default(false).notNull(),

  // Stripe Connect OAuth (for org's own Stripe account to sell licenses)
  stripeConnectId: text("stripe_connect_id"), // acct_xxx
  stripeAccessToken: text("stripe_access_token"),
  stripeRefreshToken: text("stripe_refresh_token"),
  stripeScope: text("stripe_scope"),
  stripeTokenType: text("stripe_token_type"),
  stripeConnectedAt: timestamp("stripe_connected_at", { withTimezone: true }),
  stripeWebhookSecret: text("stripe_webhook_secret"),
  stripeWebhookEndpointId: text("stripe_webhook_endpoint_id"),

  // ==================== SUBSCRIPTION (Perpetually billing) ====================
  // This is for billing the org for using Perpetually, separate from their Stripe Connect

  subscriptionTier: text("subscription_tier", {
    enum: ["starter", "pro", "business"],
  })
    .notNull()
    .default("starter"),

  subscriptionStatus: text("subscription_status", {
    enum: ["trialing", "active", "past_due", "canceled"],
  }), // null = starter (free, no subscription needed)

  // Stripe customer for Perpetually billing
  billingStripeCustomerId: text("billing_stripe_customer_id"), // cus_xxx
  billingStripeSubscriptionId: text("billing_stripe_subscription_id"), // sub_xxx
  billingCurrentPeriodEnd: timestamp("billing_current_period_end", { withTimezone: true }),
  billingTrialEndsAt: timestamp("billing_trial_ends_at", { withTimezone: true }),

  // ==================== BRANDING (Business tier only) ====================

  brandingEnabled: boolean("branding_enabled").default(false).notNull(),
  brandLogo: text("brand_logo"), // URL to logo image
  brandAccentColor: text("brand_accent_color"), // Hex color, e.g., "#FF6B35"
  brandSupportEmail: text("brand_support_email"),
  brandHidePoweredBy: boolean("brand_hide_powered_by").default(false).notNull(),
});

// ==================== MEMBERSHIP (User <-> Organization) ====================

export const membership = pgTable(
  "membership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    role: text("role", { enum: ["owner", "admin", "member"] })
      .notNull()
      .default("member"),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("membership_userId_idx").on(table.userId),
    index("membership_orgId_idx").on(table.organizationId),
    uniqueIndex("membership_unique").on(table.userId, table.organizationId),
  ]
);

// ==================== INVITATION ====================

export const invitation = pgTable(
  "invitation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    email: text("email").notNull(),
    role: text("role", { enum: ["member"] })
      .notNull()
      .default("member"),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitation_orgId_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
    index("invitation_token_idx").on(table.token),
  ]
);

// ==================== PRODUCT ====================

export const product = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),

    // Mirrors Stripe's active state (no local override)
    isActive: boolean("is_active").default(true).notNull(),

    // Stripe sync
    stripeProductId: text("stripe_product_id"),
    syncedAt: timestamp("synced_at", { withTimezone: true }),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("product_orgId_idx").on(table.organizationId),
    uniqueIndex("product_slug_org_unique").on(table.slug, table.organizationId),
  ]
);

// ==================== LICENSE POLICY ====================

export const licensePolicy = pgTable(
  "license_policy",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    name: text("name").notNull(),
    licenseLengthDays: integer("license_length_days"), // null = perpetual (never expires)
    activationLimit: integer("activation_limit"), // null = unlimited

    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("license_policy_productId_idx").on(table.productId),
  ]
);

// ==================== CUSTOMER ====================

export const customer = pgTable(
  "customer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company"),

    // Stripe sync
    stripeCustomerId: text("stripe_customer_id"),
    syncedAt: timestamp("synced_at", { withTimezone: true }),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("customer_orgId_idx").on(table.organizationId),
    uniqueIndex("customer_email_org_unique").on(table.email, table.organizationId),
  ]
);

// ==================== LICENSE ====================

export const license = pgTable(
  "license",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    // License key (unique, user-facing)
    key: text("key").notNull().unique(),
    keyCreatedAt: timestamp("key_created_at", { withTimezone: true }).notNull(),

    // Status (simple: active or disabled, expired is computed from expiresAt)
    status: text("status", {
      enum: ["active", "disabled"],
    })
      .notNull()
      .default("active"),

    // Expiration (null = never expires, expired = now > expiresAt AND status = active)
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    // Limits (copied from policy at creation, can be overridden)
    activationLimit: integer("activation_limit"), // null = unlimited

    // Disable tracking (only set when status = disabled)
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    disabledReason: text("disabled_reason", {
      enum: ["refund", "chargeback", "fraud", "customer_request", "other"],
    }),
    disabledNotes: text("disabled_notes"),

    // Stripe reference
    stripePaymentIntentId: text("stripe_payment_intent_id"),

    // Test mode flag (mirrors Stripe's livemode)
    isTest: boolean("is_test").default(false).notNull(),

    // Expiration notification tracking
    expiryNotified7DaysAt: timestamp("expiry_notified_7days_at", { withTimezone: true }),
    expiryNotified1DayAt: timestamp("expiry_notified_1day_at", { withTimezone: true }),
    expiryNotifiedExpiredAt: timestamp("expiry_notified_expired_at", { withTimezone: true }),

    // Relations
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    licensePolicyId: uuid("license_policy_id").references(() => licensePolicy.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("license_orgId_idx").on(table.organizationId),
    index("license_productId_idx").on(table.productId),
    index("license_customerId_idx").on(table.customerId),
    index("license_status_idx").on(table.status),
    index("license_isTest_idx").on(table.isTest),
  ]
);

// ==================== ACTIVATION ====================

export const activation = pgTable(
  "activation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    // Machine/device identifier
    name: text("name"), // Optional friendly name
    machineId: text("machine_id"), // Hardware fingerprint

    // Metadata
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),

    licenseId: uuid("license_id")
      .notNull()
      .references(() => license.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("activation_licenseId_idx").on(table.licenseId),
    index("activation_orgId_idx").on(table.organizationId),
  ]
);

// ==================== SECRET KEY (API Authentication) ====================

export const secretKey = pgTable(
  "secret_key",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    // The actual secret key
    key: text("key").notNull(),
    name: text("name"), // Optional friendly name

    // Scope/permissions
    scopes: jsonb("scopes").$type<string[]>().default([]),

    // Optional expiry
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("secret_key_orgId_idx").on(table.organizationId),
  ]
);

// ==================== LICENSE EVENT (Audit Trail) ====================

export const licenseEvent = pgTable(
  "license_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    // Event type
    type: text("type", {
      enum: [
        "license.created",
        "license.status_changed",
        "license.extended",
        "license.key_regenerated",
        "activation.created",
        "activation.removed",
      ],
    }).notNull(),

    // Actor tracking
    actorType: text("actor_type", {
      enum: ["user", "api", "system", "customer"],
    }).notNull(),
    actorId: text("actor_id"), // userId, secretKeyId, or null for system

    // Event data (varies by type)
    data: jsonb("data").$type<Record<string, unknown>>(),

    // Metadata
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    // Relations
    licenseId: uuid("license_id")
      .notNull()
      .references(() => license.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("license_event_licenseId_idx").on(table.licenseId),
    index("license_event_orgId_idx").on(table.organizationId),
    index("license_event_type_idx").on(table.type),
    index("license_event_createdAt_idx").on(table.createdAt),
  ]
);

// ==================== RELATIONS ====================

export const relations = defineRelations(
  {
    user,
    session,
    account,
    verification,
    organization,
    membership,
    invitation,
    product,
    licensePolicy,
    customer,
    license,
    activation,
    secretKey,
    licenseEvent,
  },
  (r) => ({
    // Auth relations
    user: {
      sessions: r.many.session({
        from: r.user.id,
        to: r.session.userId,
      }),
      accounts: r.many.account({
        from: r.user.id,
        to: r.account.userId,
      }),
      memberships: r.many.membership({
        from: r.user.id,
        to: r.membership.userId,
      }),
    },
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
      }),
    },
    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
      }),
    },

    // Organization relations
    organization: {
      memberships: r.many.membership({
        from: r.organization.id,
        to: r.membership.organizationId,
      }),
      invitations: r.many.invitation({
        from: r.organization.id,
        to: r.invitation.organizationId,
      }),
      products: r.many.product({
        from: r.organization.id,
        to: r.product.organizationId,
      }),
      customers: r.many.customer({
        from: r.organization.id,
        to: r.customer.organizationId,
      }),
      licenses: r.many.license({
        from: r.organization.id,
        to: r.license.organizationId,
      }),
      activations: r.many.activation({
        from: r.organization.id,
        to: r.activation.organizationId,
      }),
      secretKeys: r.many.secretKey({
        from: r.organization.id,
        to: r.secretKey.organizationId,
      }),
      licenseEvents: r.many.licenseEvent({
        from: r.organization.id,
        to: r.licenseEvent.organizationId,
      }),
    },
    // Invitation relations
    invitation: {
      organization: r.one.organization({
        from: r.invitation.organizationId,
        to: r.organization.id,
      }),
      invitedByUser: r.one.user({
        from: r.invitation.invitedBy,
        to: r.user.id,
      }),
    },
    membership: {
      user: r.one.user({
        from: r.membership.userId,
        to: r.user.id,
      }),
      organization: r.one.organization({
        from: r.membership.organizationId,
        to: r.organization.id,
      }),
    },

    // Product relations
    product: {
      organization: r.one.organization({
        from: r.product.organizationId,
        to: r.organization.id,
      }),
      licensePolicies: r.many.licensePolicy({
        from: r.product.id,
        to: r.licensePolicy.productId,
      }),
      licenses: r.many.license({
        from: r.product.id,
        to: r.license.productId,
      }),
    },
    licensePolicy: {
      product: r.one.product({
        from: r.licensePolicy.productId,
        to: r.product.id,
      }),
    },

    // Customer relations
    customer: {
      organization: r.one.organization({
        from: r.customer.organizationId,
        to: r.organization.id,
      }),
      licenses: r.many.license({
        from: r.customer.id,
        to: r.license.customerId,
      }),
    },

    // License relations
    license: {
      organization: r.one.organization({
        from: r.license.organizationId,
        to: r.organization.id,
      }),
      product: r.one.product({
        from: r.license.productId,
        to: r.product.id,
      }),
      customer: r.one.customer({
        from: r.license.customerId,
        to: r.customer.id,
      }),
      licensePolicy: r.one.licensePolicy({
        from: r.license.licensePolicyId,
        to: r.licensePolicy.id,
      }),
      activations: r.many.activation({
        from: r.license.id,
        to: r.activation.licenseId,
      }),
      events: r.many.licenseEvent({
        from: r.license.id,
        to: r.licenseEvent.licenseId,
      }),
    },

    // Activation relations
    activation: {
      license: r.one.license({
        from: r.activation.licenseId,
        to: r.license.id,
      }),
      organization: r.one.organization({
        from: r.activation.organizationId,
        to: r.organization.id,
      }),
    },

    // Secret key relations
    secretKey: {
      organization: r.one.organization({
        from: r.secretKey.organizationId,
        to: r.organization.id,
      }),
    },

    // License event relations
    licenseEvent: {
      license: r.one.license({
        from: r.licenseEvent.licenseId,
        to: r.license.id,
      }),
      organization: r.one.organization({
        from: r.licenseEvent.organizationId,
        to: r.organization.id,
      }),
    },
  })
);
