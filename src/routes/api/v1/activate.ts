/**
 * POST /api/v1/activate
 *
 * Activates a license on a device/machine.
 * Creates an activation record if the license is valid and under its activation limit.
 */

import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import db from "@/lib/db/db";
import { secretKey } from "@/lib/db/schema";
import { activateLicense } from "@/lib/services/license";
import {
  ActivateRequestSchema,
  licenseErrorToMessage,
  licenseErrorToStatus,
} from "@/lib/api/utils";

export const Route = createFileRoute("/api/v1/activate")({
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

        const parsed = ActivateRequestSchema.safeParse(body);
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
        const result = await activateLicense({
          licenseId: parsed.data.licenseId,
          organizationId: foundKey.organizationId,
          name: parsed.data.name,
        });

        if (!result.success) {
          const status = licenseErrorToStatus[result.error];
          const error = licenseErrorToMessage[result.error];

          return Response.json({ activated: false, error }, { status });
        }

        return Response.json({
          activated: true,
          error: null,
          activation: {
            id: result.data.id,
            createdAt: result.data.createdAt.toISOString(),
            updatedAt: result.data.updatedAt.toISOString(),
            teamId: result.data.organizationId,
            name: result.data.name,
            licenseId: result.data.licenseId,
          },
        });
      },
    },
  },
});
