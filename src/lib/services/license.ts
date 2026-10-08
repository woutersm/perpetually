/**
 * Core License Service
 *
 * Pure business logic for license operations.
 * Used by both API endpoints and server functions.
 *
 * Design principles:
 * - No HTTP concerns (status codes, response formats)
 * - No framework-specific patterns (no throwing for control flow)
 * - Returns discriminated unions for type-safe error handling
 * - Database operations are injected or use shared db instance
 */

import { eq, and } from "drizzle-orm";
import db from "@/lib/db/db";
import { license, activation, licenseEvent, licensePolicy } from "@/lib/db/schema";
import { generateLicenseKey } from "@/lib/keys";

// ============================================
// Types
// ============================================

export type License = typeof license.$inferSelect;
export type Activation = typeof activation.$inferSelect;

// Error codes for license operations
export const LicenseErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  DISABLED: "DISABLED",
  EXPIRED: "EXPIRED",
  ACTIVATION_LIMIT_REACHED: "ACTIVATION_LIMIT_REACHED",
  INVALID_KEY: "INVALID_KEY",
} as const;

export type LicenseErrorCode = (typeof LicenseErrorCode)[keyof typeof LicenseErrorCode];

// Error codes for activation operations
export const ActivationErrorCode = {
  NOT_FOUND: "NOT_FOUND",
} as const;

export type ActivationErrorCode = (typeof ActivationErrorCode)[keyof typeof ActivationErrorCode];

// Result types using discriminated unions
export type LicenseResult<T> =
  | { success: true; data: T }
  | { success: false; error: LicenseErrorCode; disabledReason?: string | null };

export type ActivationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActivationErrorCode };

// Input types
export interface ValidateLicenseInput {
  licenseId: string;
  key: string;
  organizationId: string;
}

export interface ActivateLicenseInput {
  licenseId: string;
  organizationId: string;
  name?: string | null;
  machineId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface DeactivateInput {
  activationId: string;
  organizationId: string;
}

// Output types
export interface ValidatedLicense {
  id: string;
  key: string;
  createdAt: Date;
  expiresAt: Date | null;
  activations: number;
  activationLimit: number | null;
}

// ============================================
// Core Functions
// ============================================

/**
 * Find a license by ID and organization
 * Returns the license or NOT_FOUND error
 */
export async function findLicense(
  licenseId: string,
  organizationId: string
): Promise<LicenseResult<License>> {
  const [foundLicense] = await db
    .select()
    .from(license)
    .where(and(eq(license.id, licenseId), eq(license.organizationId, organizationId)))
    .limit(1);

  if (!foundLicense) {
    return { success: false, error: LicenseErrorCode.NOT_FOUND };
  }

  return { success: true, data: foundLicense };
}

/**
 * Check if a license is in a valid state (not disabled, not expired)
 * Assumes the license exists - call findLicense first
 */
export function checkLicenseState(licenseData: License): LicenseResult<License> {
  // Check if license is disabled
  if (licenseData.status === "disabled") {
    return {
      success: false,
      error: LicenseErrorCode.DISABLED,
      disabledReason: licenseData.disabledReason,
    };
  }

  // Check if license is expired (by date) - expiresAt can be null for perpetual licenses
  const now = new Date();
  if (licenseData.expiresAt && licenseData.expiresAt < now) {
    return { success: false, error: LicenseErrorCode.EXPIRED };
  }

  return { success: true, data: licenseData };
}

/**
 * Check if a license can accept more activations
 */
export async function checkActivationLimit(
  licenseData: License
): Promise<LicenseResult<{ license: License; currentCount: number }>> {
  // Get current activation count
  const existingActivations = await db
    .select()
    .from(activation)
    .where(eq(activation.licenseId, licenseData.id));

  const currentCount = existingActivations.length;

  // Check activation limit (null = unlimited)
  if (licenseData.activationLimit !== null && currentCount >= licenseData.activationLimit) {
    return { success: false, error: LicenseErrorCode.ACTIVATION_LIMIT_REACHED };
  }

  return { success: true, data: { license: licenseData, currentCount } };
}

/**
 * Validate a license (check exists, key matches, not disabled, not expired)
 * Used by the /validate API endpoint
 */
export async function validateLicense(
  input: ValidateLicenseInput
): Promise<LicenseResult<ValidatedLicense>> {
  // Find license
  const findResult = await findLicense(input.licenseId, input.organizationId);
  if (!findResult.success) {
    return findResult;
  }

  const licenseData = findResult.data;

  // Check key matches
  if (licenseData.key !== input.key) {
    return { success: false, error: LicenseErrorCode.INVALID_KEY };
  }

  // Check license state (disabled, expired)
  const stateResult = checkLicenseState(licenseData);
  if (!stateResult.success) {
    return stateResult;
  }

  // Get activation count
  const activations = await db
    .select()
    .from(activation)
    .where(eq(activation.licenseId, licenseData.id));

  return {
    success: true,
    data: {
      id: licenseData.id,
      key: licenseData.key,
      createdAt: licenseData.createdAt,
      expiresAt: licenseData.expiresAt,
      activations: activations.length,
      activationLimit: licenseData.activationLimit,
    },
  };
}

/**
 * Activate a license (create activation record)
 * Validates license state and limits before creating activation
 */
export async function activateLicense(
  input: ActivateLicenseInput
): Promise<LicenseResult<Activation>> {
  // Find license
  const findResult = await findLicense(input.licenseId, input.organizationId);
  if (!findResult.success) {
    return findResult;
  }

  const licenseData = findResult.data;

  // Check license state (disabled, expired)
  const stateResult = checkLicenseState(licenseData);
  if (!stateResult.success) {
    return stateResult;
  }

  // Check activation limit
  const limitResult = await checkActivationLimit(licenseData);
  if (!limitResult.success) {
    return limitResult;
  }

  // Create activation
  const [newActivation] = await db
    .insert(activation)
    .values({
      name: input.name ?? null,
      machineId: input.machineId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      licenseId: input.licenseId,
      organizationId: input.organizationId,
    })
    .returning();

  return { success: true, data: newActivation };
}

/**
 * Deactivate (delete) an activation
 */
export async function deactivate(
  input: DeactivateInput
): Promise<ActivationResult<Activation>> {
  // Find and delete activation
  const [deleted] = await db
    .delete(activation)
    .where(
      and(eq(activation.id, input.activationId), eq(activation.organizationId, input.organizationId))
    )
    .returning();

  if (!deleted) {
    return { success: false, error: ActivationErrorCode.NOT_FOUND };
  }

  return { success: true, data: deleted };
}

/**
 * Get activation count for a license
 */
export async function getActivationCount(licenseId: string): Promise<number> {
  const activations = await db
    .select()
    .from(activation)
    .where(eq(activation.licenseId, licenseId));

  return activations.length;
}

// ============================================
// Issuing
// ============================================

export interface IssueLicenseInput {
  organizationId: string;
  productId: string;
  customerId: string;
  stripePaymentIntentId: string;
  isTest: boolean;
  /** Overrides from Stripe metadata; fall back to the product's first policy */
  activationLimit?: number;
  licenseDurationDays?: number;
  /** Extra fields recorded on the license.created audit event */
  eventData?: Record<string, unknown>;
}

/**
 * Create a license for a completed payment and record the audit event.
 * Shared by the Stripe webhook and the demo purchase simulator.
 */
export async function issueLicense(input: IssueLicenseInput) {
  const [defaultPolicy] = await db
    .select()
    .from(licensePolicy)
    .where(eq(licensePolicy.productId, input.productId))
    .limit(1);

  const activationLimit =
    input.activationLimit ?? defaultPolicy?.activationLimit ?? null;
  // A policy with licenseLengthDays = null is perpetual; with no policy, default to a year
  const licenseDurationDays =
    input.licenseDurationDays ??
    (defaultPolicy ? defaultPolicy.licenseLengthDays : 365);

  const now = new Date();
  const expiresAt =
    licenseDurationDays === null || licenseDurationDays === 0
      ? null
      : new Date(now.getTime() + licenseDurationDays * 24 * 60 * 60 * 1000);

  const [newLicense] = await db
    .insert(license)
    .values({
      key: generateLicenseKey(),
      keyCreatedAt: now,
      status: "active",
      expiresAt,
      activationLimit,
      stripePaymentIntentId: input.stripePaymentIntentId,
      isTest: input.isTest,
      productId: input.productId,
      customerId: input.customerId,
      organizationId: input.organizationId,
      licensePolicyId: defaultPolicy?.id,
    })
    .returning();

  await db.insert(licenseEvent).values({
    type: "license.created",
    actorType: "system",
    actorId: null,
    data: {
      stripePaymentIntentId: input.stripePaymentIntentId,
      ...input.eventData,
      isTest: input.isTest,
      expiresAt: expiresAt?.toISOString() ?? null,
      activationLimit,
    },
    licenseId: newLicense.id,
    organizationId: input.organizationId,
  });

  return { license: newLicense, activationLimit, licenseDurationDays, expiresAt };
}
