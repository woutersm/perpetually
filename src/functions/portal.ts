import { createServerFn } from "@tanstack/react-start";
import db from "@/lib/db/db";
import {
  license,
  customer,
  product,
  organization,
  activation,
  licenseEvent,
} from "@/lib/db/schema";
import { eq, and, asc, desc, inArray } from "drizzle-orm";

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
    const licensesData = await db
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

    // Get activations for all licenses
    const licenseIds = licensesData.map((l) => l.id);
    const activations =
      licenseIds.length > 0
        ? await db
            .select({
              id: activation.id,
              name: activation.name,
              machineId: activation.machineId,
              ipAddress: activation.ipAddress,
              createdAt: activation.createdAt,
              lastSeenAt: activation.lastSeenAt,
              licenseId: activation.licenseId,
            })
            .from(activation)
            .where(inArray(activation.licenseId, licenseIds))
            .orderBy(desc(activation.createdAt))
        : [];

    // Get customer-relevant events (activations and key regeneration)
    const events =
      licenseIds.length > 0
        ? await db
            .select({
              id: licenseEvent.id,
              type: licenseEvent.type,
              createdAt: licenseEvent.createdAt,
              data: licenseEvent.data,
              licenseId: licenseEvent.licenseId,
            })
            .from(licenseEvent)
            .where(
              and(
                inArray(licenseEvent.licenseId, licenseIds),
                inArray(licenseEvent.type, [
                  "activation.created",
                  "activation.removed",
                  "license.key_regenerated",
                  "license.created",
                ])
              )
            )
            .orderBy(desc(licenseEvent.createdAt))
            .limit(50)
        : [];

    // Combine licenses with their activations
    const licenses = licensesData.map((lic) => ({
      ...lic,
      activations: activations.filter((a) => a.licenseId === lic.id),
      activationCount: activations.filter((a) => a.licenseId === lic.id).length,
    }));

    return {
      customer: customerData,
      licenses,
      events,
      organization: {
        name: org.name,
        slug: org.slug,
        // Branding - only include if enabled
        branding: org.brandingEnabled
          ? {
              logo: org.brandLogo,
              accentColor: org.brandAccentColor,
              supportEmail: org.brandSupportEmail,
              hidePoweredBy: org.brandHidePoweredBy,
            }
          : null,
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
    const oldKey = existingLicense.key;

    const [updated] = await db
      .update(license)
      .set({
        key: newKey,
        keyCreatedAt: new Date(),
      })
      .where(eq(license.id, licenseId))
      .returning();

    // Log the key regeneration event
    await db.insert(licenseEvent).values({
      type: "license.key_regenerated",
      actorType: "customer",
      actorId: customerId,
      data: {
        oldKeyPrefix: oldKey.substring(0, 9) + "...",
        newKeyPrefix: newKey.substring(0, 9) + "...",
      },
      licenseId,
      organizationId: org.id,
    });

    return updated;
  });

// Remove an activation for a customer (public, no auth required)
export const removeActivation = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { slug: string; customerId: string; licenseId: string; activationId: string }) =>
      data
  )
  .handler(async ({ data }) => {
    const { slug, customerId, licenseId, activationId } = data;

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

    // Verify the activation belongs to this license
    const [existingActivation] = await db
      .select()
      .from(activation)
      .where(
        and(
          eq(activation.id, activationId),
          eq(activation.licenseId, licenseId)
        )
      )
      .limit(1);

    if (!existingActivation) {
      throw new Error("Activation not found");
    }

    // Delete the activation
    await db.delete(activation).where(eq(activation.id, activationId));

    // Log the activation removal event
    await db.insert(licenseEvent).values({
      type: "activation.removed",
      actorType: "customer",
      actorId: customerId,
      data: {
        activationId,
        name: existingActivation.name,
        machineId: existingActivation.machineId,
        removedBy: "customer",
      },
      licenseId,
      organizationId: org.id,
    });

    return { success: true };
  });
