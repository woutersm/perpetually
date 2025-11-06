import { Request, Response, NextFunction } from "express";
import { ValidateError } from "@tsoa/runtime";
import consola from "consola";
import { openapiErrors } from "@perpetually/db/types";

/**
 * OpenAPI-formatted error response
 */
interface OpenApiErrorResponse {
  type: string;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Standard error response format
 */
interface ApiErrorResponse {
  status: number;
  message: string;
  details?: Record<string, any>;
}

/**
 * Error handler middleware for tsoa
 *
 * Handles:
 * - ValidateError (400): Validation errors from request body/query validation
 * - Auth errors (401/403): Authentication and authorization errors
 * - Custom errors with status codes
 * - Generic server errors (500)
 *
 * @param err - The error object
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Get the full path (including any baseUrl/mount path)
  const fullPath = req.baseUrl + req.path;

  // Handle validation errors (400)
  if (err instanceof ValidateError) {
    consola.warn(`Validation Error for ${fullPath}:`, err.fields);

    const response: OpenApiErrorResponse = {
      type: openapiErrors.badRequest,
      errors: Object.entries(err.fields).map(([field, error]: [string, any]) => {
        // Remove "body." prefix if present (tsoa includes it in field names)
        const cleanField = field.replace(/^body\./, '');
        return {
          path: `/body/${cleanField}`,
          message: error?.message || `Invalid value for ${cleanField}`,
        };
      }),
    };

    res.status(400).json(response);
    return;
  }

  // Handle auth errors (401/403)
  if (err.isAuthError && err.status && err.type) {
    const response: OpenApiErrorResponse = {
      type: err.type,
      errors: [
        {
          path: fullPath,
          message: err.message || "Authentication failed",
        },
      ],
    };

    res.status(err.status).json(response);
    return;
  }

  // Handle custom errors with explicit status codes
  if (err.status && typeof err.status === "number") {
    const response: ApiErrorResponse = {
      status: err.status,
      message: err.message || "An error occurred",
    };

    // Include body if provided (for custom error responses)
    if (err.body) {
      res.status(err.status).json(err.body);
      return;
    }

    res.status(err.status).json(response);
    return;
  }

  // Log unexpected errors
  consola.error("Unexpected error:", {
    message: err.message,
    stack: err.stack,
    path: fullPath,
    method: req.method,
  });

  // Generic server error response (500)
  const response: OpenApiErrorResponse = {
    type: openapiErrors.internalServerError,
    errors: [
      {
        path: fullPath,
        message: "Internal Server Error",
      },
    ],
  };

  res.status(500).json(response);
}

/**
 * 404 handler for undefined routes
 * Should be added after all other route handlers
 *
 * @param req - Express request
 * @param res - Express response
 */
export function notFoundHandler(req: Request, res: Response): void {
  const fullPath = req.baseUrl + req.path;

  const response: OpenApiErrorResponse = {
    type: openapiErrors.badRequest,
    errors: [
      {
        path: fullPath,
        message: "Not Found",
      },
    ],
  };

  res.status(404).json(response);
}
