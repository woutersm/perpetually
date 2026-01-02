/**
 * POST /api/v1/validate
 *
 * Validates a license key. Returns license details if valid.
 */

import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import db from "@/lib/db/db";
import { secretKey } from "@/lib/db/schema";
import { validateLicense, LicenseErrorCode } from "@/lib/services/license";
import {
  ValidateRequestSchema,
  licenseErrorToMessage,
  licenseErrorToStatus,
} from "@/lib/api/utils";

export const Route = createFileRoute("/api/v1/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth middleware inline
        const authHeader = request.headers.get("Authorization");

        if (!authHeader) {
          return Response.json(
            { error: "Authorization header required" },
            { status: 401 }
          );
        }

        const token = authHeader.replace("Bearer ", "");

        const [foundKey] = await db
          .select({
            id: secretKey.id,
            organizationId: secretKey.organizationId,
          })
          .from(secretKey)
          .where(eq(secretKey.key, token))
          .limit(1);

        if (!foundKey) {
          return Response.json(
            { error: "Invalid API key" },
            { status: 403 }
          );
        }

        // Update last used timestamp
        await db
          .update(secretKey)
          .set({ lastUsedAt: new Date() })
          .where(eq(secretKey.id, foundKey.id));

        // Parse and validate body
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = ValidateRequestSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            {
              error: "Validation error",
              details: parsed.error.errors.map((e) => ({
                path: e.path.join("."),
                message: e.message,
              })),
            },
            { status: 400 }
          );
        }

        // Call core service
        const result = await validateLicense({
          licenseId: parsed.data.licenseId,
          key: parsed.data.key,
          organizationId: foundKey.organizationId,
        });

        if (!result.success) {
          const status = licenseErrorToStatus[result.error];
          const error = licenseErrorToMessage[result.error];

          if (result.error === LicenseErrorCode.DISABLED) {
            return Response.json(
              {
                valid: false,
                error,
                disabledReason: result.disabledReason ?? undefined,
              },
              { status }
            );
          }

          return Response.json({ valid: false, error }, { status });
        }

        return Response.json({
          valid: true,
          error: null,
          license: {
            id: result.data.id,
            key: result.data.key,
            createdAt: result.data.createdAt.toISOString(),
            expiresAt: result.data.expiresAt?.toISOString() ?? null,
            activations: result.data.activations,
            activationLimit: result.data.activationLimit ?? 0,
          },
        });
      },
    },
  },
});
