import { z } from "@hono/zod-openapi";

// ============================================
// Error Constants (matching @perpetually/db/types)
// ============================================

export const ApiErrors = {
  apiKeyInvalid: "Invalid API key",
  noLicenseFound: "No license found",
  noActivationFound: "No activation found",
  licenseDisabled: "License is disabled",
  licenseExpired: "License is expired",
  keyInvalid: "No valid key",
  activationLimitReached: "Activation limit reached",
  noProductFound: "No product found",
} as const;

export const OpenApiErrors = {
  badRequest: "Bad Request",
  unauthorized: "Unauthorized",
  internalServerError: "Internal server error",
} as const;

// ============================================
// Common Schemas
// ============================================

export const ErrorResponseSchema = z
  .object({
    type: z.string().openapi({ example: "Bad Request" }),
    errors: z
      .array(
        z.object({
          path: z.string().openapi({ example: "/body/licenseId" }),
          message: z.string().openapi({ example: "'licenseId' is required" }),
        })
      )
      .optional(),
    error: z.string().optional().openapi({ example: "No license found" }),
  })
  .openapi("ErrorResponse");

// ============================================
// Validate License Endpoint
// ============================================

export const ValidateRequestSchema = z
  .object({
    licenseId: z.string().openapi({
      example: "550e8400-e29b-41d4-a716-446655440000",
      description: "The unique identifier of the license to validate",
    }),
    key: z.string().openapi({
      example: "4b6f-1234-5678-9abc",
      description: "The license key to validate",
    }),
  })
  .openapi("ValidateRequest");

export const LicenseDetailsSchema = z
  .object({
    id: z.string().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    key: z.string().openapi({ example: "4b6f-1234-5678-9abc" }),
    createdAt: z.string().openapi({ example: "2024-01-15T10:30:00.000Z" }),
    expiresAt: z.string().openapi({ example: "2025-01-15T10:30:00.000Z" }),
    activations: z.number().int().openapi({ example: 1 }),
    activationLimit: z.number().int().openapi({ example: 5 }),
  })
  .openapi("LicenseDetails");

export const ValidateSuccessResponseSchema = z
  .object({
    valid: z.literal(true),
    error: z.null(),
    license: LicenseDetailsSchema,
  })
  .openapi("ValidateSuccessResponse");

export const ValidateErrorResponseSchema = z
  .object({
    valid: z.literal(false),
    error: z.string().openapi({ example: ApiErrors.keyInvalid }),
  })
  .openapi("ValidateErrorResponse");

// ============================================
// Activate License Endpoint
// ============================================

export const ActivateRequestSchema = z
  .object({
    licenseId: z.string().openapi({
      example: "550e8400-e29b-41d4-a716-446655440000",
      description: "The unique identifier of the license to activate",
    }),
    name: z.string().optional().openapi({
      example: "user@example.com",
      description: "Optional name/identifier for this activation (e.g., device name, user email)",
    }),
  })
  .openapi("ActivateRequest");

export const ActivationDetailsSchema = z
  .object({
    id: z.string().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    createdAt: z.string().openapi({ example: "2024-01-15T10:30:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2024-01-15T10:30:00.000Z" }),
    teamId: z.string().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    name: z.string().nullable().openapi({ example: "user@example.com" }),
    licenseId: z.string().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
  })
  .openapi("ActivationDetails");

export const ActivateSuccessResponseSchema = z
  .object({
    activated: z.literal(true),
    error: z.null(),
    activation: ActivationDetailsSchema,
  })
  .openapi("ActivateSuccessResponse");

export const ActivateErrorResponseSchema = z
  .object({
    activated: z.literal(false),
    error: z.string().openapi({ example: ApiErrors.activationLimitReached }),
  })
  .openapi("ActivateErrorResponse");

// ============================================
// Deactivate License Endpoint
// ============================================

export const DeactivateRequestSchema = z
  .object({
    activationId: z.string().openapi({
      example: "550e8400-e29b-41d4-a716-446655440000",
      description: "The unique identifier of the activation to deactivate",
    }),
  })
  .openapi("DeactivateRequest");

export const DeactivateSuccessResponseSchema = z
  .object({
    deactivated: z.literal(true),
    error: z.null(),
    activation: z.null(),
  })
  .openapi("DeactivateSuccessResponse");

export const DeactivateErrorResponseSchema = z
  .object({
    deactivated: z.literal(false),
    error: z.string().openapi({ example: ApiErrors.noActivationFound }),
  })
  .openapi("DeactivateErrorResponse");

// Note: POST /licenses was removed in Phase 2
// Licenses are created automatically via Stripe webhooks

// ============================================
// Type Exports (inferred from Zod schemas)
// ============================================

export type ValidateRequest = z.infer<typeof ValidateRequestSchema>;
export type ValidateSuccessResponse = z.infer<typeof ValidateSuccessResponseSchema>;
export type ValidateErrorResponse = z.infer<typeof ValidateErrorResponseSchema>;
export type ValidateResponse = ValidateSuccessResponse | ValidateErrorResponse;

export type ActivateRequest = z.infer<typeof ActivateRequestSchema>;
export type ActivateSuccessResponse = z.infer<typeof ActivateSuccessResponseSchema>;
export type ActivateErrorResponse = z.infer<typeof ActivateErrorResponseSchema>;
export type ActivateResponse = ActivateSuccessResponse | ActivateErrorResponse;

export type DeactivateRequest = z.infer<typeof DeactivateRequestSchema>;
export type DeactivateSuccessResponse = z.infer<typeof DeactivateSuccessResponseSchema>;
export type DeactivateErrorResponse = z.infer<typeof DeactivateErrorResponseSchema>;
export type DeactivateResponse = DeactivateSuccessResponse | DeactivateErrorResponse;

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
