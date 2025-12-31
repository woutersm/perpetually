import db from "@/lib/db/db";
import { licenseEvent } from "@/lib/db/schema";

// Event types as defined in the schema
export type LicenseEventType =
  | "license.created"
  | "license.status_changed"
  | "license.extended"
  | "license.key_regenerated"
  | "activation.created"
  | "activation.removed";

// Actor types as defined in the schema
export type ActorType = "user" | "api" | "system" | "customer";

export interface LogLicenseEventParams {
  licenseId: string;
  organizationId: string;
  type: LicenseEventType;
  actorType: ActorType;
  actorId?: string | null;
  data?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Log a license event to the audit trail
 */
export async function logLicenseEvent({
  licenseId,
  organizationId,
  type,
  actorType,
  actorId = null,
  data,
  ipAddress,
  userAgent,
}: LogLicenseEventParams): Promise<void> {
  await db.insert(licenseEvent).values({
    type,
    actorType,
    actorId,
    data: data ?? null,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
    licenseId,
    organizationId,
  });
}

/**
 * Helper to create event data for status changes
 */
export function createStatusChangeData(params: {
  previousStatus: string;
  newStatus: string;
  reason?: string | null;
  notes?: string | null;
}): Record<string, unknown> {
  return {
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    ...(params.reason && { reason: params.reason }),
    ...(params.notes && { notes: params.notes }),
  };
}

/**
 * Helper to create event data for activation events
 */
export function createActivationData(params: {
  activationId: string;
  name?: string | null;
  machineId?: string | null;
}): Record<string, unknown> {
  return {
    activationId: params.activationId,
    ...(params.name && { name: params.name }),
    ...(params.machineId && { machineId: params.machineId }),
  };
}

/**
 * Helper to create event data for license extension
 */
export function createExtensionData(params: {
  previousExpiresAt: Date | null;
  newExpiresAt: Date | null;
}): Record<string, unknown> {
  return {
    previousExpiresAt: params.previousExpiresAt?.toISOString() ?? null,
    newExpiresAt: params.newExpiresAt?.toISOString() ?? null,
  };
}
