import { createServerFn } from "@tanstack/react-start";
import { loggingMiddleware } from "@/middleware/logging";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { product, licensePolicy, license } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Get all products for the current organization
export const getProducts = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getProducts")])
  .handler(async ({ context: { organizationId } }) => {
    const products = await db
      .select()
      .from(product)
      .where(eq(product.organizationId, organizationId))
      .orderBy(desc(product.createdAt));

    return products;
  });

// Get a single product with relations
export const getProduct = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getProduct")])
  .inputValidator((data: { productId: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
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
  .middleware([authMiddleware, loggingMiddleware("updateProduct")])
  .inputValidator(
    (data: {
      productId: string;
      description?: string;
    }) => data
  )
  .handler(async ({ data, context: { organizationId } }) => {
    const { productId, description } = data;

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

    return updated;
  });

// Note: Products cannot be deleted - they are synced from Stripe
// deleteProduct was removed in Phase 2

// Create a license policy
export const createLicensePolicy = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("createLicensePolicy")])
  .inputValidator(
    (data: {
      productId: string;
      name: string;
      licenseLengthDays?: number;
      activationLimit?: number;
    }) => data
  )
  .handler(async ({ data, context: { organizationId } }) => {
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

    return newPolicy;
  });
