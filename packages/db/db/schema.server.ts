import { relations, sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  uniqueIndex,
  timestamp,
} from "drizzle-orm/pg-core";
import { productStatusEnum } from "../types";

export type License = typeof licenseSchema.$inferSelect;
export type Release = typeof releaseSchema.$inferSelect;
export type Customer = typeof customerSchema.$inferSelect;
export type Product = typeof productSchema.$inferSelect;
export type Activation = typeof activationsSchema.$inferSelect;
export type Team = typeof teamSchema.$inferSelect;
export type LicensePolicy = typeof licensePolicySchema.$inferSelect;

export const teamSchema = pgTable("teams", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),

  name: text("name").notNull(),
  slug: text("slug").notNull(),

  apiKey: text("api_key").notNull(),

  isOnboarded: integer("is_onboarded").notNull().default(0),

  stripeApiKey: text("stripe_api_key"),
  stripeWebhookSecret: text("stripe_webhook_secret"),

  stripeCustomerId: text("stripe_customer_id"),
  checkoutSessionId: text("checkout_session_id"),
});

export const teamRelations = relations(teamSchema, ({ many, one }) => ({
  users: many(userSchema),
  products: many(productSchema),
  secretKeys: one(secretKeySchema),
}));

export const productSchema = pgTable(
  "products",
  {
    id: text("id").primaryKey().notNull(),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: text("status").notNull().default(productStatusEnum.pending),
    stripeProductId: text("stripe_product_id"),

    teamId: text("team_id")
      .references(() => teamSchema.id)
      .notNull(),
  },
  (table) => {
    return {
      stripeProductIdIndex: uniqueIndex("products_stripe_product_id_index").on(
        table.stripeProductId
      ),
    };
  }
);

export const productRelations = relations(productSchema, ({ one, many }) => ({
  team: one(teamSchema, {
    fields: [productSchema.teamId],
    references: [teamSchema.id],
  }),
  licenses: many(licenseSchema),
  releases: many(releaseSchema),
  licensePolicies: many(licensePolicySchema),
}));

export const releaseSchema = pgTable("releases", {
  id: text("id").primaryKey().notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),

  tag: text("tag").notNull(),
  description: text("description"),

  productId: text("product_id")
    .references(() => productSchema.id)
    .notNull(),
});

export const releaseRelations = relations(releaseSchema, ({ one }) => ({
  policy: one(productSchema, {
    fields: [releaseSchema.productId],
    references: [productSchema.id],
  }),
}));

export const customerSchema = pgTable(
  "customers",
  {
    id: text("id").primaryKey().notNull(),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),

    name: text("name").notNull(),
    email: text("email").notNull(),
  },
  (table) => {
    return {
      customerEmailIndex: uniqueIndex("customers_email_index").on(table.email),
    };
  }
);

export const customerRelations = relations(customerSchema, ({ many }) => ({
  licenses: many(licenseSchema),
}));

export const licenseSchema = pgTable("licenses", {
  id: text("id").primaryKey().notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),

  expiresAt: text("expires_at").notNull(),

  // Cant set the default status here because it needs to be set when
  // the license is created. Its based on the type of the license policy.
  status: text("status").notNull(),

  keyCreatedAt: text("key_created_at").notNull(),
  key: text("key").notNull(),

  activationLimit: integer("activationLimit"),

  productId: text("product_id")
    .references(() => productSchema.id)
    .notNull(),

  teamId: text("team_id")
    .references(() => teamSchema.id)
    .notNull(),

  customerId: text("customer_id")
    .references(() => customerSchema.id)
    .notNull(),
});

export const licenseRelations = relations(licenseSchema, ({ one, many }) => ({
  customer: one(customerSchema, {
    fields: [licenseSchema.customerId],
    references: [customerSchema.id],
  }),
  team: one(teamSchema, {
    fields: [licenseSchema.teamId],
    references: [teamSchema.id],
  }),
  product: one(productSchema, {
    fields: [licenseSchema.productId],
    references: [productSchema.id],
  }),
  activations: many(activationsSchema),
}));

export const activationsSchema = pgTable("activations", {
  id: text("id").primaryKey().notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),

  name: text("name"),

  licenseId: text("license_id")
    .references(() => licenseSchema.id)
    .notNull(),

  teamId: text("team_id")
    .references(() => teamSchema.id)
    .notNull(),
});

export const activationsRelations = relations(activationsSchema, ({ one }) => ({
  license: one(licenseSchema, {
    fields: [activationsSchema.licenseId],
    references: [licenseSchema.id],
  }),
  team: one(teamSchema, {
    fields: [activationsSchema.teamId],
    references: [teamSchema.id],
  }),
}));

export const userSchema = pgTable("users", {
  id: text("id").primaryKey(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),

  email: text("email").notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),

  teamId: text("team_id")
    .references(() => teamSchema.id)
    .notNull(),
});

export const userRelations = relations(userSchema, ({ one }) => ({
  team: one(teamSchema, {
    fields: [userSchema.teamId],
    references: [teamSchema.id],
  }),
}));

export const secretKeySchema = pgTable("secret_keys", {
  id: text("id").primaryKey().notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),

  secretKey: text("secret_key").notNull(),

  teamId: text("team_id")
    .references(() => teamSchema.id)
    .notNull(),
});

export const secretKeySchemaRelations = relations(
  secretKeySchema,
  ({ one }) => ({
    team: one(teamSchema, {
      fields: [secretKeySchema.teamId],
      references: [teamSchema.id],
    }),
  })
);

export const licensePolicySchema = pgTable("license_policies", {
  id: text("id").primaryKey().notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),

  type: text("type").notNull(),
  licenseLength: integer("licenseLength").notNull(),
  activationLimit: integer("activationLimit"),

  productId: text("product_id")
    .references(() => productSchema.id)
    .notNull(),
});

export const licensePolicyRelations = relations(
  licensePolicySchema,
  ({ one }) => ({
    product: one(productSchema, {
      fields: [licensePolicySchema.productId],
      references: [productSchema.id],
    }),
  })
);
