/**
 * API Utilities
 *
 * Shared utilities for API routes including validation helpers,
 * error response formatting, and type definitions.
 */

import { z } from "zod";
import { LicenseErrorCode, ActivationErrorCode } from "@/lib/services/license";

// ============================================
// Error Constants
// ============================================

export const ApiErrors = {
  apiKeyInvalid: "Invalid API key",
  noLicenseFound: "No license found",
  noActivationFound: "No activation found",
  licenseDisabled: "License is disabled",
  licenseExpired: "License is expired",
  keyInvalid: "No valid key",
  activationLimitReached: "Activation limit reached",
  validationError: "Validation error",
} as const;

// ============================================
// Error Mapping
// ============================================

export const licenseErrorToMessage: Record<LicenseErrorCode, string> = {
  [LicenseErrorCode.NOT_FOUND]: ApiErrors.noLicenseFound,
  [LicenseErrorCode.DISABLED]: ApiErrors.licenseDisabled,
  [LicenseErrorCode.EXPIRED]: ApiErrors.licenseExpired,
  [LicenseErrorCode.ACTIVATION_LIMIT_REACHED]: ApiErrors.activationLimitReached,
  [LicenseErrorCode.INVALID_KEY]: ApiErrors.keyInvalid,
};

export const licenseErrorToStatus: Record<LicenseErrorCode, number> = {
  [LicenseErrorCode.NOT_FOUND]: 404,
  [LicenseErrorCode.DISABLED]: 400,
  [LicenseErrorCode.EXPIRED]: 400,
  [LicenseErrorCode.ACTIVATION_LIMIT_REACHED]: 400,
  [LicenseErrorCode.INVALID_KEY]: 400,
};

export const activationErrorToMessage: Record<ActivationErrorCode, string> = {
  [ActivationErrorCode.NOT_FOUND]: ApiErrors.noActivationFound,
};

export const activationErrorToStatus: Record<ActivationErrorCode, number> = {
  [ActivationErrorCode.NOT_FOUND]: 404,
};

// ============================================
// Validation Schemas
// ============================================

export const ValidateRequestSchema = z.object({
  licenseId: z.string().uuid(),
  key: z.string().min(1),
});

export const ActivateRequestSchema = z.object({
  licenseId: z.string().uuid(),
  name: z.string().optional(),
});

export const DeactivateRequestSchema = z.object({
  activationId: z.string().uuid(),
});

// ============================================
// Response Helpers
// ============================================

/**
 * Create a JSON error response
 */
export function errorResponse(
  error: string,
  status: number,
  extra?: Record<string, unknown>
): Response {
  return Response.json({ error, ...extra }, { status });
}

/**
 * Create a validation error response from Zod errors
 */
export function validationErrorResponse(error: z.ZodError): Response {
  return Response.json(
    {
      error: ApiErrors.validationError,
      details: error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    },
    { status: 400 }
  );
}

/**
 * Parse and validate request body with Zod schema
 * Returns parsed data or throws Response with validation errors
 */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    throw validationErrorResponse(result.error);
  }

  return result.data;
}
