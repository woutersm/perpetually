/**
 * API Request/Response Types
 *
 * These types are used across the API for request validation and response typing.
 */

// ============================================
// Validate License Endpoint
// ============================================

/**
 * Request body for license validation
 */
export interface ValidateRequest {
  licenseId: string;
  key: string;
}

/**
 * License details in validation response
 */
export interface LicenseDetails {
  id: string;
  key: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  activations: number;
  activationLimit: number;
}

/**
 * Response from license validation endpoint
 */
export interface ValidateResponse {
  valid: boolean;
  error: string | null;
  license?: LicenseDetails;
}

// ============================================
// Activate License Endpoint
// ============================================

/**
 * Request body for license activation
 */
export interface ActivateRequest {
  licenseId: string;
  name?: string;
}

/**
 * Activation details in response
 */
export interface ActivationDetails {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  teamId: string;
  name: string | null;
  licenseId: string;
}

/**
 * Response from license activation endpoint
 */
export interface ActivateResponse {
  activated: boolean;
  error: string | null;
  activation?: ActivationDetails;
}

// ============================================
// Create License Endpoint
// ============================================

/**
 * Request body for creating a license
 */
export interface CreateLicenseRequest {
  productId: string;
  name: string;
  email: string;
}

/**
 * License object in create response
 */
export interface CreatedLicense {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  expiresAt: Date | string;
  status: string;
  keyCreatedAt: Date | string;
  key: string;
  activationLimit: number | null;
  productId: string;
  teamId: string;
  customerId: string;
}

/**
 * Response from license creation endpoint
 */
export interface CreateLicenseResponse {
  created: boolean;
  error: string | null;
  license?: CreatedLicense;
}

// ============================================
// Deactivate License Endpoint
// ============================================

/**
 * Request body for deactivating a license activation
 */
export interface DeactivateRequest {
  activationId: string;
}

/**
 * Response from deactivation endpoint
 */
export interface DeactivateResponse {
  deactivated: boolean;
  error: string | null;
  activation: null;
}

// ============================================
// Common Types
// ============================================

/**
 * Standard error response format
 */
export interface ErrorResponse {
  status: number;
  message: string;
  body?: any;
}

/**
 * Validation error details
 */
export interface ValidationError {
  fields: Record<string, any>;
  message: string;
}

/**
 * Type for authenticated user data returned from expressAuthentication
 */
export interface AuthenticatedUser {
  teamId: string;
}
