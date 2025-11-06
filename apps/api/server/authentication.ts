import { Request } from "express";
import { db } from "@perpetually/db/config";
import { teamSchema } from "@perpetually/db/schema";
import { eq } from "drizzle-orm";
import { apiErrorsEnum, openapiErrors } from "@perpetually/db/types";

/**
 * Express authentication middleware for tsoa
 *
 * Handles authentication for the @Security("bearer") decorator
 * Validates Bearer tokens against the team's API key
 *
 * @param request - Express request object
 * @param securityName - The security scheme name (e.g., "bearer")
 * @param _scopes - Optional scopes (not used in this implementation)
 * @returns Promise resolving to the authenticated user data
 * @throws Error with 401 (missing auth) or 403 (invalid auth) status
 */
export async function expressAuthentication(
  request: Request,
  securityName: string,
  _scopes?: string[]
): Promise<any> {
  if (securityName === "bearer") {
    const authHeader = request.headers.authorization;

    // 401: No authorization header provided
    if (!authHeader) {
      const error: any = new Error("Authorization header required");
      error.status = 401;
      error.type = openapiErrors.unauthorized;
      error.isAuthError = true;
      throw error;
    }

    // Extract bearer token
    const matches = authHeader.match(/Bearer\s+(.+)/i);
    if (!matches || !matches[1]) {
      const error: any = new Error("Authorization header required");
      error.status = 401;
      error.type = openapiErrors.unauthorized;
      error.isAuthError = true;
      throw error;
    }

    const apiKey = matches[1];

    // Lookup team by API key
    const team = await db.query.teamSchema.findFirst({
      where: eq(teamSchema.apiKey, apiKey),
      columns: {
        id: true,
      },
    });

    // 403: Invalid API key
    if (!team) {
      const error: any = new Error(apiErrorsEnum.apiKeyInvalid);
      error.status = 403;
      error.type = openapiErrors.unauthorized;
      error.isAuthError = true;
      throw error;
    }

    // Return authenticated user data (injected via @Inject() decorator)
    return {
      teamId: team.id,
    };
  }

  const error: any = new Error(`Unknown security scheme: ${securityName}`);
  error.status = 401;
  error.type = openapiErrors.unauthorized;
  error.isAuthError = true;
  throw error;
}
