import { createServerFn } from "@tanstack/react-start";
import { wideEventMiddleware } from "@/middleware/wide-event";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { license, activation, product, customer, licenseEvent } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  logLicenseEvent,
  createStatusChangeData,
  createActivationData,
  createExtensionData,
} from "@/lib/audit";
import {
  activateLicense,
  deactivate,
  LicenseErrorCode,
  ActivationErrorCode,
} from "@/lib/services/license";

// ============================================
// Error Mapping (core service -> exceptions)
// ============================================

const licenseErrorMessages: Record<LicenseErrorCode, string> = {
  [LicenseErrorCode.NOT_FOUND]: "License not found",
  [LicenseErrorCode.DISABLED]: "License is disabled",
  [LicenseErrorCode.EXPIRED]: "License is expired",
  [LicenseErrorCode.ACTIVATION_LIMIT_REACHED]: "Activation limit reached",
  [LicenseErrorCode.INVALID_KEY]: "Invalid license key",
};

const activationErrorMessages: Record<ActivationErrorCode, string> = {
  [ActivationErrorCode.NOT_FOUND]: "Activation not found",
};

// Get all licenses for the current organization
export const getLicenses = createServerFn({ method: "GET" })
  .middleware([authMiddleware, wideEventMiddleware("license.list")])
  .inputValidator((data: { isTestMode?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { organizationId, event } = context;
    const isTestMode = data?.isTestMode ?? false;

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
        isTest: license.isTest,
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
        and(
          eq(license.organizationId, organizationId),
          eq(license.isTest, isTestMode)
        )
      )
      .orderBy(desc(license.createdAt));

    event.set("result.count", licenses.length);
    event.set("filter.is_test", isTestMode);

    return licenses;
  });

// Get a single license with activations
export const getLicense = createServerFn({ method: "GET" })
  .middleware([authMiddleware, wideEventMiddleware("license.get")])
  .inputValidator((data: { licenseId: string }) => data)
  .handler(async ({ data, context }) => {
    const { organizationId, event } = context;

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
        isTest: license.isTest,
        // Disabled fields
        disabledAt: license.disabledAt,
        disabledReason: license.disabledReason,
        disabledNotes: license.disabledNotes,
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

    event.set("license.id", licenseData.id);
    event.set("license.status", licenseData.status);
    event.set("activations.count", activations.length);

    return {
      ...licenseData,
      activations,
    };
  });

// Note: Licenses are created automatically from Stripe payments
// createLicense was removed in Phase 2

// Update a license
export const updateLicense = createServerFn({ method: "POST" })
  .middleware([authMiddleware, wideEventMiddleware("license.update")])
  .inputValidator(
    (data: {
      licenseId: string;
      expiresAt?: string;
      activationLimit?: number | null;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const { organizationId, user, event } = context;
    const { licenseId, ...updates } = data;

    // Get current license for comparison
    const [currentLicense] = await db
      .select()
      .from(license)
      .where(
        and(eq(license.id, licenseId), eq(license.organizationId, organizationId))
      )
      .limit(1);

    if (!currentLicense) {
      throw new Error("License not found");
    }

    event.set("license.id", licenseId);
    event.set("license.previous_status", currentLicense.status);

    const updateData: Record<string, unknown> = {};
    const newExpiresAt = updates.expiresAt ? new Date(updates.expiresAt) : undefined;
    if (newExpiresAt) updateData.expiresAt = newExpiresAt;
    if (updates.activationLimit !== undefined)
      updateData.activationLimit = updates.activationLimit;

    const [updated] = await db
      .update(license)
      .set(updateData)
      .where(
        and(eq(license.id, licenseId), eq(license.organizationId, organizationId))
      )
      .returning();

    // Log license.extended if expiresAt changed
    if (newExpiresAt && currentLicense.expiresAt?.getTime() !== newExpiresAt.getTime()) {
      await logLicenseEvent({
        licenseId,
        organizationId,
        type: "license.extended",
        actorType: "user",
        actorId: user.id,
        data: createExtensionData({
          previousExpiresAt: currentLicense.expiresAt,
          newExpiresAt,
        }),
      });
      event.set("license.extended", true);
      event.set("license.new_expires_at", newExpiresAt.toISOString());
    }

    if (updates.activationLimit !== undefined) {
      event.set("license.new_activation_limit", updates.activationLimit);
    }

    return updated;
  });

// Create an activation
export const createActivation = createServerFn({ method: "POST" })
  .middleware([authMiddleware, wideEventMiddleware("activation.create")])
  .inputValidator(
    (data: { licenseId: string; name?: string; machineId?: string }) => data
  )
  .handler(async ({ data, context }) => {
    const { organizationId, user, event } = context;

    event.set("license.id", data.licenseId);

    // Use core service for validation and creation
    const result = await activateLicense({
      licenseId: data.licenseId,
      organizationId,
      name: data.name,
      machineId: data.machineId,
    });

    if (!result.success) {
      event.set("activation.error", result.error);
      throw new Error(licenseErrorMessages[result.error]);
    }

    const newActivation = result.data;

    event.set("activation", {
      id: newActivation.id,
      name: newActivation.name,
      machine_id: newActivation.machineId,
    });

    // Log activation.created event (audit trail)
    await logLicenseEvent({
      licenseId: data.licenseId,
      organizationId,
      type: "activation.created",
      actorType: "user",
      actorId: user.id,
      data: createActivationData({
        activationId: newActivation.id,
        name: newActivation.name,
        machineId: newActivation.machineId,
      }),
    });

    return newActivation;
  });

// Delete an activation
export const deleteActivation = createServerFn({ method: "POST" })
  .middleware([authMiddleware, wideEventMiddleware("activation.delete")])
  .inputValidator((data: { activationId: string }) => data)
  .handler(async ({ data, context }) => {
    const { organizationId, user, event } = context;

    event.set("activation.id", data.activationId);

    // Use core service for deactivation
    const result = await deactivate({
      activationId: data.activationId,
      organizationId,
    });

    if (!result.success) {
      event.set("activation.error", result.error);
      throw new Error(activationErrorMessages[result.error]);
    }

    const deleted = result.data;

    event.set("license.id", deleted.licenseId);
    event.set("activation.deleted", true);

    // Log activation.removed event (audit trail)
    await logLicenseEvent({
      licenseId: deleted.licenseId,
      organizationId,
      type: "activation.removed",
      actorType: "user",
      actorId: user.id,
      data: createActivationData({
        activationId: deleted.id,
        name: deleted.name,
        machineId: deleted.machineId,
      }),
    });

    return { success: true };
  });

// Disable a license
export const disableLicense = createServerFn({ method: "POST" })
  .middleware([authMiddleware, wideEventMiddleware("license.disable")])
  .inputValidator(
    (data: {
      licenseId: string;
      reason: "refund" | "chargeback" | "fraud" | "customer_request" | "other";
      notes?: string;
    }) => data
  )
  .handler(async ({ data, context }) => {
    const { organizationId, user, event } = context;

    event.set("license.id", data.licenseId);
    event.set("license.disable_reason", data.reason);

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

    event.set("license.new_status", "disabled");

    // Log license.status_changed event
    await logLicenseEvent({
      licenseId: data.licenseId,
      organizationId,
      type: "license.status_changed",
      actorType: "user",
      actorId: user.id,
      data: createStatusChangeData({
        previousStatus: "active",
        newStatus: "disabled",
        reason: data.reason,
        notes: data.notes,
      }),
    });

    return updated;
  });

// Enable a license (clears disabled fields)
export const enableLicense = createServerFn({ method: "POST" })
  .middleware([authMiddleware, wideEventMiddleware("license.enable")])
  .inputValidator((data: { licenseId: string }) => data)
  .handler(async ({ data, context }) => {
    const { organizationId, user, event } = context;

    event.set("license.id", data.licenseId);

    const [updated] = await db
      .update(license)
      .set({
        status: "active",
        disabledAt: null,
        disabledReason: null,
        disabledNotes: null,
      })
      .where(
        and(eq(license.id, data.licenseId), eq(license.organizationId, organizationId))
      )
      .returning();

    if (!updated) {
      throw new Error("License not found");
    }

    event.set("license.new_status", "active");

    // Log license.status_changed event
    await logLicenseEvent({
      licenseId: data.licenseId,
      organizationId,
      type: "license.status_changed",
      actorType: "user",
      actorId: user.id,
      data: createStatusChangeData({
        previousStatus: "disabled",
        newStatus: "active",
      }),
    });

    return updated;
  });

// Get license events (audit trail)
export const getLicenseEvents = createServerFn({ method: "GET" })
  .middleware([authMiddleware, wideEventMiddleware("license.events")])
  .inputValidator((data: { licenseId: string }) => data)
  // @ts-expect-error - Drizzle json mode infers unknown for data field which conflicts with TanStack Start's type inference
  .handler(async ({ data, context }) => {
    const { organizationId, event } = context;

    event.set("license.id", data.licenseId);

    // First verify the license belongs to this org
    const [licenseData] = await db
      .select({ id: license.id })
      .from(license)
      .where(
        and(eq(license.id, data.licenseId), eq(license.organizationId, organizationId))
      )
      .limit(1);

    if (!licenseData) {
      throw new Error("License not found");
    }

    // Get all events for this license
    const events = await db
      .select()
      .from(licenseEvent)
      .where(eq(licenseEvent.licenseId, data.licenseId))
      .orderBy(desc(licenseEvent.createdAt));

    event.set("result.count", events.length);

    return events;
  });
