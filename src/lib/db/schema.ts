import { defineRelations, sql } from "drizzle-orm";
import {
  text,
  integer,
  sqliteTable,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

// ==================== BETTER-AUTH TABLES ====================

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userIdIdx: index("session_userId_idx").on(table.userId),
  })
);

export const account = sqliteTable(
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
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("account_userId_idx").on(table.userId),
  })
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
  })
);

// ==================== ORGANIZATION (Multi-tenancy) ====================

export const organization = sqliteTable("organization", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),

  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),

  // Public API key for client-side license validation
  apiKey: text("api_key").notNull(),

  // Onboarding state
  isOnboarded: integer("is_onboarded", { mode: "boolean" })
    .default(false)
    .notNull(),

  // Stripe Connect OAuth
  stripeConnectId: text("stripe_connect_id"), // acct_xxx
  stripeAccessToken: text("stripe_access_token"),
  stripeRefreshToken: text("stripe_refresh_token"),
  stripeScope: text("stripe_scope"),
  stripeTokenType: text("stripe_token_type"),
  stripeConnectedAt: integer("stripe_connected_at", { mode: "timestamp_ms" }),
  stripeWebhookSecret: text("stripe_webhook_secret"),
  stripeWebhookEndpointId: text("stripe_webhook_endpoint_id"),
});

// ==================== MEMBERSHIP (User <-> Organization) ====================

export const membership = sqliteTable(
  "membership",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),

    role: text("role", { enum: ["owner", "admin", "member"] })
      .notNull()
      .default("member"),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userIdIdx: index("membership_userId_idx").on(table.userId),
    orgIdIdx: index("membership_orgId_idx").on(table.organizationId),
    uniqueMembership: uniqueIndex("membership_unique").on(
      table.userId,
      table.organizationId
    ),
  })
);

// ==================== PRODUCT ====================

export const product = sqliteTable(
  "product",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: text("status", { enum: ["pending", "active", "archived"] })
      .notNull()
      .default("pending"),
    stripeProductId: text("stripe_product_id"),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
  },
  (table) => ({
    orgIdIdx: index("product_orgId_idx").on(table.organizationId),
    slugOrgUnique: uniqueIndex("product_slug_org_unique").on(
      table.slug,
      table.organizationId
    ),
  })
);

// ==================== RELEASE ====================

export const release = sqliteTable(
  "release",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),

    tag: text("tag").notNull(), // e.g., "v1.0.0"
    description: text("description"),

    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
  },
  (table) => ({
    productIdIdx: index("release_productId_idx").on(table.productId),
  })
);

// ==================== LICENSE POLICY ====================

export const licensePolicy = sqliteTable(
  "license_policy",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),

    name: text("name").notNull(),
    type: text("type", { enum: ["perpetual", "subscription", "trial"] }).notNull(),
    licenseLengthDays: integer("license_length_days").notNull(), // Duration in days
    activationLimit: integer("activation_limit"), // null = unlimited

    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
  },
  (table) => ({
    productIdIdx: index("license_policy_productId_idx").on(table.productId),
  })
);

// ==================== CUSTOMER ====================

export const customer = sqliteTable(
  "customer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),

    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company"),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
  },
  (table) => ({
    orgIdIdx: index("customer_orgId_idx").on(table.organizationId),
    emailOrgUnique: uniqueIndex("customer_email_org_unique").on(
      table.email,
      table.organizationId
    ),
  })
);

// ==================== LICENSE ====================

export const license = sqliteTable(
  "license",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),

    // License key (unique, user-facing)
    key: text("key").notNull().unique(),
    keyCreatedAt: integer("key_created_at", { mode: "timestamp_ms" }).notNull(),

    // Status
    status: text("status", {
      enum: ["active", "expired", "suspended", "revoked"],
    }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),

    // Limits (copied from policy at creation, can be overridden)
    activationLimit: integer("activation_limit"), // null = unlimited

    // Relations
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    licensePolicyId: text("license_policy_id").references(
      () => licensePolicy.id,
      { onDelete: "set null" }
    ),
  },
  (table) => ({
    orgIdIdx: index("license_orgId_idx").on(table.organizationId),
    productIdIdx: index("license_productId_idx").on(table.productId),
    customerIdIdx: index("license_customerId_idx").on(table.customerId),
    statusIdx: index("license_status_idx").on(table.status),
  })
);

// ==================== ACTIVATION ====================

export const activation = sqliteTable(
  "activation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),

    // Machine/device identifier
    name: text("name"), // Optional friendly name
    machineId: text("machine_id"), // Hardware fingerprint

    // Metadata
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),

    licenseId: text("license_id")
      .notNull()
      .references(() => license.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
  },
  (table) => ({
    licenseIdIdx: index("activation_licenseId_idx").on(table.licenseId),
    orgIdIdx: index("activation_orgId_idx").on(table.organizationId),
  })
);

// ==================== SECRET KEY (API Authentication) ====================

export const secretKey = sqliteTable(
  "secret_key",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),

    // The actual secret key
    key: text("key").notNull(),
    name: text("name"), // Optional friendly name

    // Scope/permissions
    scopes: text("scopes", { mode: "json" }).$type<string[]>().default([]),

    // Optional expiry
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
  },
  (table) => ({
    orgIdIdx: index("secret_key_orgId_idx").on(table.organizationId),
  })
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
    product,
    release,
    licensePolicy,
    customer,
    license,
    activation,
    secretKey,
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
      releases: r.many.release({
        from: r.product.id,
        to: r.release.productId,
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
    release: {
      product: r.one.product({
        from: r.release.productId,
        to: r.product.id,
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
  })
);
