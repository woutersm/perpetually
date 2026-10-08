import { createServerFn } from "@tanstack/react-start";
import { wideEventMiddleware } from "@/middleware/wide-event";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { product, licensePolicy, license } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Get all products for the current organization
export const getProducts = createServerFn({ method: "GET" })
  .middleware([authMiddleware, wideEventMiddleware("product.list")])
  .handler(async ({ context }) => {
    const { organizationId, event } = context;

    const products = await db
      .select()
      .from(product)
      .where(eq(product.organizationId, organizationId))
      .orderBy(desc(product.createdAt));

    event.set("result.count", products.length);

    return products;
  });

// Get a single product with relations
export const getProduct = createServerFn({ method: "GET" })
  .middleware([authMiddleware, wideEventMiddleware("product.get")])
  .inputValidator((data: { productId: string }) => data)
  .handler(async ({ data, context }) => {
    const { organizationId, event } = context;

    event.set("product.id", data.productId);

    const [productData] = await db
      .select()
      .from(product)
      .where(
        and(eq(product.id, data.productId), eq(product.organizationId, organizationId))
      )
      .limit(1);

    if (!productData) {
      throw new Error("Product not found");
    }

    // Get license policies
    const policies = await db
      .select()
      .from(licensePolicy)
      .where(eq(licensePolicy.productId, data.productId))
      .orderBy(desc(licensePolicy.createdAt));

    // Get license count
    const licenses = await db
      .select()
      .from(license)
      .where(eq(license.productId, data.productId));

    event.set("product.name", productData.name);
    event.set("policies.count", policies.length);
    event.set("licenses.count", licenses.length);

    return {
      ...productData,
      licensePolicies: policies,
      licenseCount: licenses.length,
    };
  });

// Note: Products are synced from Stripe, not created manually
// createProduct was removed in Phase 2

// Update a product (local settings like description only)
// Note: name and slug come from Stripe, only description is editable locally
export const updateProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware, wideEventMiddleware("product.update")])
  .inputValidator(
    (data: {
      productId: string;
      description?: string;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const { organizationId, event } = context;
    const { productId, description } = data;

    event.set("product.id", productId);

    const [updated] = await db
      .update(product)
      .set({ description })
      .where(
        and(eq(product.id, productId), eq(product.organizationId, organizationId))
      )
      .returning();

    if (!updated) {
      throw new Error("Product not found");
    }

    event.set("product.name", updated.name);

    return updated;
  });

// Note: Products cannot be deleted - they are synced from Stripe
// deleteProduct was removed in Phase 2

// Create a license policy
export const createLicensePolicy = createServerFn({ method: "POST" })
  .middleware([authMiddleware, wideEventMiddleware("policy.create")])
  .inputValidator(
    (data: {
      productId: string;
      name: string;
      licenseLengthDays?: number;
      activationLimit?: number;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const { organizationId, event } = context;

    event.set("product.id", data.productId);

    // Verify product belongs to org
    const [productData] = await db
      .select()
      .from(product)
      .where(
        and(eq(product.id, data.productId), eq(product.organizationId, organizationId))
      )
      .limit(1);

    if (!productData) {
      throw new Error("Product not found");
    }

    const [newPolicy] = await db
      .insert(licensePolicy)
      .values({
        productId: data.productId,
        name: data.name,
        licenseLengthDays: data.licenseLengthDays ?? null,
        activationLimit: data.activationLimit ?? null,
      })
      .returning();

    event.set("policy.id", newPolicy.id);
    event.set("policy.name", newPolicy.name);
    event.set("policy.license_length_days", newPolicy.licenseLengthDays);
    event.set("policy.activation_limit", newPolicy.activationLimit);

    return newPolicy;
  });
