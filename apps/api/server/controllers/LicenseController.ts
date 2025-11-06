import { and, eq } from "drizzle-orm";
import { apiErrorsEnum } from "@perpetually/db/types";
import { db } from "@perpetually/db/config";
import { licenseSchema, activationsSchema } from "@perpetually/db/schema";
import invariant from "tiny-invariant";
import consola from "consola";
import {
  Route,
  Post,
  Body,
  Security,
  Response,
  SuccessResponse,
  Tags,
  Example,
  Request,
} from "tsoa";
import {
  isLicenseValid,
  createActivation,
  createLicenseAction,
  getStripeProductId,
} from "@perpetually/db/models";
import type {
  ValidateRequest,
  ValidateResponse,
  ActivateRequest,
  ActivateResponse,
  CreateLicenseRequest,
  CreateLicenseResponse,
  DeactivateRequest,
  DeactivateResponse,
} from "../types";

/**
 * Type for authenticated user data returned from expressAuthentication
 */
interface AuthenticatedUser {
  teamId: string;
}

@Route("")
@Tags("Licenses")
export class LicenseController {
  /**
   * Validate a license using the provided license ID and key.
   * Returns the license details if the key is valid.
   *
   * @summary Validate License
   */
  @Post("/validate")
  @Security("bearer")
  @SuccessResponse(200, "License validation successful")
  @Response<ValidateResponse>(200)
  @Response(400, "Invalid license key")
  @Response(403, "Invalid or missing API key")
  @Response(404, "License not found")
  @Example<ValidateResponse>({
    valid: true,
    error: null,
    license: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      key: "4b6f-1234-5678-9abc",
      createdAt: "2024-01-15T10:30:00.000Z",
      expiresAt: "2025-01-15T10:30:00.000Z",
      activations: 1,
      activationLimit: 5,
    },
  })
  async validate(
    @Body() body: ValidateRequest,
    @Request() req: any
  ): Promise<ValidateResponse> {
    const user: AuthenticatedUser = req.user;
    const teamId = user.teamId;
    invariant(teamId, "Authenticated user required");

    consola.info("Validating key: ", {
      licenseId: body.licenseId,
      key: body.key,
    });

    const license = await db.query.licenseSchema.findFirst({
      where: and(
        eq(licenseSchema.id, body.licenseId),
        eq(licenseSchema.teamId, teamId)
      ),
      with: {
        team: { with: { secretKeys: { columns: { secretKey: true } } } },
      },
    });

    if (!license || !license.team.secretKeys?.secretKey) {
      throw {
        status: 404,
        message: apiErrorsEnum.noLicenseFound,
        body: { valid: false, error: apiErrorsEnum.noLicenseFound },
      };
    }

    const { valid, error } = await isLicenseValid({
      license,
      key: body.key,
      secretKey: license.team.secretKeys.secretKey,
    });

    consola.info("isLicenseValid", { license, key: body.key, valid, error });

    if (!valid) {
      throw {
        status: 400,
        message: error,
        body: { valid: false, error },
      };
    }

    return {
      valid: true,
      error: null,
      license: {
        id: license.id,
        key: license.key,
        createdAt: license.createdAt,
        expiresAt: license.expiresAt,
        // TODO: use the actual activations / activationLimit
        activations: 1,
        activationLimit: 5,
      },
    };
  }

  /**
   * Activate a license using the provided license ID.
   * Each activation can be tracked with an optional name.
   *
   * @summary Activate License
   */
  @Post("/activate")
  @Security("bearer")
  @SuccessResponse(200, "License activation successful")
  @Response<ActivateResponse>(200)
  @Response(400, "Activation failed (e.g., activation limit exceeded)")
  @Response(403, "Invalid or missing API key")
  @Response(404, "License not found")
  @Example<ActivateResponse>({
    activated: true,
    error: null,
    activation: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      createdAt: "2024-01-15T10:30:00.000Z",
      updatedAt: "2024-01-15T10:30:00.000Z",
      teamId: "550e8400-e29b-41d4-a716-446655440000",
      name: "user@example.com",
      licenseId: "550e8400-e29b-41d4-a716-446655440000",
    },
  })
  async activate(
    @Body() body: ActivateRequest,
    @Request() req: any
  ): Promise<ActivateResponse> {
    const user: AuthenticatedUser = req.user;
    const teamId = user.teamId;
    invariant(teamId, "Authenticated user required");

    const license = await db.query.licenseSchema.findFirst({
      where: and(
        eq(licenseSchema.id, body.licenseId),
        eq(licenseSchema.teamId, teamId)
      ),
      with: { activations: true },
    });

    if (!license) {
      throw {
        status: 404,
        message: apiErrorsEnum.noLicenseFound,
        body: {
          activated: false,
          error: apiErrorsEnum.noLicenseFound,
        },
      };
    }

    const { error, activated, activation } = await createActivation({
      licenseId: body.licenseId,
      name: body.name || "",
    });

    if (!activated) {
      throw {
        status: 400,
        message: error,
        body: {
          activated,
          error,
        },
      };
    }

    return {
      activated: true,
      error: null,
      activation,
    };
  }

  /**
   * Create a new license for a product.
   * This endpoint generates a unique license key that can be used for validation.
   *
   * @summary Create License
   */
  @Post("/licenses")
  @Security("bearer")
  @SuccessResponse(200, "License created successfully")
  @Response<CreateLicenseResponse>(200)
  @Response(400, "Invalid request (missing or invalid fields)")
  @Response(403, "Invalid or missing API key")
  @Response(404, "Product not found")
  @Response(500, "Internal server error")
  @Example<CreateLicenseResponse>({
    created: true,
    error: null,
    license: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      createdAt: "2024-01-15T10:30:00.000Z",
      updatedAt: "2024-01-15T10:30:00.000Z",
      expiresAt: "2025-01-15T10:30:00.000Z",
      status: "ACTIVE",
      keyCreatedAt: "2024-01-15T10:30:00.000Z",
      key: "4b6f-1234-5678-9abc",
      activationLimit: 5,
      productId: "prod_abc123",
      teamId: "550e8400-e29b-41d4-a716-446655440000",
      customerId: "cust_123456",
    },
  })
  async createLicense(
    @Body() body: CreateLicenseRequest,
    @Request() req: any
  ): Promise<CreateLicenseResponse> {
    const user: AuthenticatedUser = req.user;
    const teamId = user.teamId;
    invariant(teamId, "Authenticated user required");

    try {
      const stripeProductId = await getStripeProductId(body.productId);

      if (!stripeProductId) {
        throw {
          status: 404,
          message: apiErrorsEnum.noProductFound,
          body: {
            created: false,
            error: apiErrorsEnum.noProductFound,
            license: undefined,
          },
        };
      }

      const { created, license, error } = await createLicenseAction({
        teamId,
        stripeProductId: stripeProductId,
        name: body.name,
        email: body.email,
      });

      if (!created && error) {
        throw {
          status: 404,
          message: error,
          body: {
            created: false,
            error,
            license: undefined,
          },
        };
      }

      return {
        created,
        error,
        license,
      };
    } catch (error: any) {
      if (error.status && error.body) {
        throw error;
      }
      consola.error("Create license error:", error);
      throw {
        status: 500,
        message: "Internal server error during create of license",
      };
    }
  }

  /**
   * Deactivate a specific license activation using the provided activation ID.
   * After deactivation, the activation can no longer be used.
   *
   * @summary Deactivate License Activation
   */
  @Post("/deactivate")
  @Security("bearer")
  @SuccessResponse(200, "License activation successfully deactivated")
  @Response<DeactivateResponse>(200)
  @Response(403, "Invalid or missing API key")
  @Response(404, "Activation not found")
  @Example<DeactivateResponse>({
    deactivated: true,
    error: null,
    activation: null,
  })
  async deactivate(
    @Body() body: DeactivateRequest,
    @Request() req: any
  ): Promise<DeactivateResponse> {
    const user: AuthenticatedUser = req.user;
    const teamId = user.teamId;
    invariant(teamId, "Authenticated user required");

    const activation = await db.query.activationsSchema.findFirst({
      where: and(
        eq(activationsSchema.id, body.activationId),
        eq(activationsSchema.teamId, teamId)
      ),
      with: { license: true },
    });

    if (!activation) {
      throw {
        status: 404,
        message: apiErrorsEnum.noActivationFound,
        body: {
          deactivated: false,
          error: apiErrorsEnum.noActivationFound,
        },
      };
    }

    await db
      .delete(activationsSchema)
      .where(eq(activationsSchema.id, body.activationId));

    return {
      deactivated: true,
      error: null,
      activation: null,
    };
  }
}
