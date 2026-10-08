/**
 * POST /api/v1/deactivate
 *
 * Deactivates (removes) an activation from a license.
 * Frees up an activation slot for reuse.
 */

import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import db from "@/lib/db/db";
import { secretKey } from "@/lib/db/schema";
import { deactivate } from "@/lib/services/license";
import {
  DeactivateRequestSchema,
  activationErrorToMessage,
  activationErrorToStatus,
  validationErrorResponse,
} from "@/lib/api/utils";

export const Route = createFileRoute("/api/v1/deactivate")({
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

        const parsed = DeactivateRequestSchema.safeParse(body);
        if (!parsed.success) {
          return validationErrorResponse(parsed.error);
        }

        // Call core service
        const result = await deactivate({
          activationId: parsed.data.activationId,
          organizationId: foundKey.organizationId,
        });

        if (!result.success) {
          const status = activationErrorToStatus[result.error];
          const error = activationErrorToMessage[result.error];

          return Response.json({ deactivated: false, error }, { status });
        }

        return Response.json({
          deactivated: true,
          error: null,
          activation: null,
        });
      },
    },
  },
});
