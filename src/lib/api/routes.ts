import { createRoute } from "@hono/zod-openapi";
import {
  ValidateRequestSchema,
  ValidateSuccessResponseSchema,
  ValidateErrorResponseSchema,
  ActivateRequestSchema,
  ActivateSuccessResponseSchema,
  ActivateErrorResponseSchema,
  DeactivateRequestSchema,
  DeactivateSuccessResponseSchema,
  DeactivateErrorResponseSchema,
  ErrorResponseSchema,
} from "./schemas";

// ============================================
// Validate License Route
// ============================================

export const validateRoute = createRoute({
  method: "post",
  path: "/validate",
  tags: ["Licenses"],
  summary: "Validate a license",
  description: "Validates a license using the provided license ID and key. Returns the license details if valid.",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: ValidateRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "License validation successful",
      content: {
        "application/json": {
          schema: ValidateSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid license (key invalid, license disabled, or license expired)",
      content: {
        "application/json": {
          schema: ValidateErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Authentication required - missing Authorization header",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Invalid API key",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "License not found",
      content: {
        "application/json": {
          schema: ValidateErrorResponseSchema,
        },
      },
    },
  },
});

// ============================================
// Activate License Route
// ============================================

export const activateRoute = createRoute({
  method: "post",
  path: "/activate",
  tags: ["Licenses"],
  summary: "Activate a license",
  description:
    "Activates a license using the provided license ID. Each activation can be tracked with an optional name (e.g., device identifier or user email).",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: ActivateRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "License activation successful",
      content: {
        "application/json": {
          schema: ActivateSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Activation failed (e.g., activation limit exceeded, license disabled)",
      content: {
        "application/json": {
          schema: ActivateErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Authentication required - missing Authorization header",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Invalid API key",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "License not found",
      content: {
        "application/json": {
          schema: ActivateErrorResponseSchema,
        },
      },
    },
  },
});

// ============================================
// Deactivate License Route
// ============================================

export const deactivateRoute = createRoute({
  method: "post",
  path: "/deactivate",
  tags: ["Licenses"],
  summary: "Deactivate a license activation",
  description:
    "Deactivates a specific license activation using the provided activation ID. After deactivation, the activation slot becomes available for reuse.",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: DeactivateRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "License activation successfully deactivated",
      content: {
        "application/json": {
          schema: DeactivateSuccessResponseSchema,
        },
      },
    },
    400: {
      description: "Validation error - missing required fields",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Authentication required - missing Authorization header",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Invalid API key",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Activation not found",
      content: {
        "application/json": {
          schema: DeactivateErrorResponseSchema,
        },
      },
    },
  },
});

// Note: POST /licenses was removed in Phase 2
// Licenses are now created automatically via Stripe webhooks

// ============================================
// Route Type Exports
// ============================================

export type ValidateRoute = typeof validateRoute;
export type ActivateRoute = typeof activateRoute;
export type DeactivateRoute = typeof deactivateRoute;
