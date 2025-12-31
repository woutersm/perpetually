import { createServerFn } from "@tanstack/react-start";
import { loggingMiddleware } from "@/middleware/logging";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { license, activation, product, customer } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Generate license key (e.g., XXXX-XXXX-XXXX-XXXX)
function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = 4;
  const segmentLength = 4;

  const parts: string[] = [];
  for (let i = 0; i < segments; i++) {
    let segment = "";
    for (let j = 0; j < segmentLength; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(segment);
  }

  return parts.join("-");
}

// Get all licenses for the current organization
export const getLicenses = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getLicenses")])
  .handler(async ({ context: { organizationId } }) => {
    const licenses = await db
      .select({
        id: license.id,
        key: license.key,
        status: license.status,
        expiresAt: license.expiresAt,
        activationLimit: license.activationLimit,
        createdAt: license.createdAt,
        productId: license.productId,
        customerId: license.customerId,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
        },
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
        },
      })
      .from(license)
      .leftJoin(product, eq(license.productId, product.id))
      .leftJoin(customer, eq(license.customerId, customer.id))
      .where(eq(license.organizationId, organizationId))
      .orderBy(desc(license.createdAt));

    return licenses;
  });

// Get a single license with activations
export const getLicense = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getLicense")])
  .inputValidator((data: { licenseId: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const [licenseData] = await db
      .select({
        id: license.id,
        key: license.key,
        keyCreatedAt: license.keyCreatedAt,
        status: license.status,
        expiresAt: license.expiresAt,
        activationLimit: license.activationLimit,
        createdAt: license.createdAt,
        productId: license.productId,
        customerId: license.customerId,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
        },
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
        },
      })
      .from(license)
      .leftJoin(product, eq(license.productId, product.id))
      .leftJoin(customer, eq(license.customerId, customer.id))
      .where(
        and(eq(license.id, data.licenseId), eq(license.organizationId, organizationId))
      )
      .limit(1);

    if (!licenseData) {
      throw new Error("License not found");
    }

    // Get activations
    const activations = await db
      .select()
      .from(activation)
      .where(eq(activation.licenseId, data.licenseId))
      .orderBy(desc(activation.createdAt));

    return {
      ...licenseData,
      activations,
    };
  });

// Note: Licenses are created automatically from Stripe payments
// createLicense was removed in Phase 2

// Update a license
export const updateLicense = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("updateLicense")])
  .inputValidator(
    (data: {
      licenseId: string;
      status?: "active" | "disabled";
      expiresAt?: string;
      activationLimit?: number | null;
    }) => data
  )
  .handler(async ({ data, context: { organizationId } }) => {
    const { licenseId, ...updates } = data;

    const updateData: Record<string, unknown> = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.expiresAt) updateData.expiresAt = new Date(updates.expiresAt);
    if (updates.activationLimit !== undefined)
      updateData.activationLimit = updates.activationLimit;

    const [updated] = await db
      .update(license)
      .set(updateData)
      .where(
        and(eq(license.id, licenseId), eq(license.organizationId, organizationId))
      )
      .returning();

    if (!updated) {
      throw new Error("License not found");
    }

    return updated;
  });

// Create an activation
export const createActivation = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("createActivation")])
  .inputValidator(
    (data: { licenseId: string; name?: string; machineId?: string }) => data
  )
  .handler(async ({ data, context: { organizationId } }) => {
    // Check license exists and belongs to org
    const [licenseData] = await db
      .select()
      .from(license)
      .where(
        and(eq(license.id, data.licenseId), eq(license.organizationId, organizationId))
      )
      .limit(1);

    if (!licenseData) {
      throw new Error("License not found");
    }

    // Check activation limit
    if (licenseData.activationLimit !== null) {
      const activations = await db
        .select()
        .from(activation)
        .where(eq(activation.licenseId, data.licenseId));

      if (activations.length >= licenseData.activationLimit) {
        throw new Error("Activation limit reached");
      }
    }

    const [newActivation] = await db
      .insert(activation)
      .values({
        name: data.name,
        machineId: data.machineId,
        licenseId: data.licenseId,
        organizationId,
      })
      .returning();

    return newActivation;
  });

// Delete an activation
export const deleteActivation = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("deleteActivation")])
  .inputValidator((data: { activationId: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const [deleted] = await db
      .delete(activation)
      .where(
        and(
          eq(activation.id, data.activationId),
          eq(activation.organizationId, organizationId)
        )
      )
      .returning();

    if (!deleted) {
      throw new Error("Activation not found");
    }

    return { success: true };
  });

// Disable a license
export const disableLicense = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("disableLicense")])
  .inputValidator(
    (data: {
      licenseId: string;
      reason: "refund" | "chargeback" | "fraud" | "customer_request" | "other";
      notes?: string;
    }) => data
  )
  .handler(async ({ data, context: { organizationId } }) => {
    const [updated] = await db
      .update(license)
      .set({
        status: "disabled",
        disabledAt: new Date(),
        disabledReason: data.reason,
        disabledNotes: data.notes ?? null,
      })
      .where(
        and(eq(license.id, data.licenseId), eq(license.organizationId, organizationId))
      )
      .returning();

    if (!updated) {
      throw new Error("License not found");
    }

    return updated;
  });
