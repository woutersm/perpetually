import { createServerFn } from "@tanstack/react-start";
import db from "@/lib/db/db";
import { license, customer, product, organization } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

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

// Get customer with their licenses for the portal (public, no auth required)
export const getPortalCustomer = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; customerId: string }) => data)
  .handler(async ({ data }) => {
    const { slug, customerId } = data;

    // Find the organization by slug
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get customer with licenses for this organization
    const [customerData] = await db
      .select({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        company: customer.company,
      })
      .from(customer)
      .where(
        and(eq(customer.id, customerId), eq(customer.organizationId, org.id))
      )
      .limit(1);

    if (!customerData) {
      throw new Error("Customer not found");
    }

    // Get licenses for this customer in this organization
    const licenses = await db
      .select({
        id: license.id,
        key: license.key,
        status: license.status,
        expiresAt: license.expiresAt,
        activationLimit: license.activationLimit,
        createdAt: license.createdAt,
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
        },
      })
      .from(license)
      .leftJoin(product, eq(license.productId, product.id))
      .where(
        and(
          eq(license.customerId, customerId),
          eq(license.organizationId, org.id)
        )
      )
      .orderBy(asc(license.status));

    return {
      customer: customerData,
      licenses,
      organization: {
        name: org.name,
        slug: org.slug,
      },
    };
  });

// Regenerate license key for a customer (public, no auth required)
export const regenerateLicenseKey = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; customerId: string; licenseId: string }) => data)
  .handler(async ({ data }) => {
    const { slug, customerId, licenseId } = data;

    // Find the organization by slug
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    // Verify the license belongs to this customer and organization
    const [existingLicense] = await db
      .select()
      .from(license)
      .where(
        and(
          eq(license.id, licenseId),
          eq(license.customerId, customerId),
          eq(license.organizationId, org.id)
        )
      )
      .limit(1);

    if (!existingLicense) {
      throw new Error("License not found");
    }

    if (existingLicense.status !== "active") {
      throw new Error("Can only regenerate keys for active licenses");
    }

    // Generate and save new key
    const newKey = generateLicenseKey();

    const [updated] = await db
      .update(license)
      .set({
        key: newKey,
        keyCreatedAt: new Date(),
      })
      .where(eq(license.id, licenseId))
      .returning();

    return updated;
  });
