import { createServerFn } from "@tanstack/react-start";
import db from "@/lib/db/db";
import { organization, membership } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSessionFn } from "./sessions";

// Check if organization slug is available (public - no auth required)
export const checkSlugAvailable = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const existing = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, data.slug))
      .limit(1);

    return { available: existing.length === 0 };
  });

// Create organization for newly registered user
export const createOrganization = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; slug: string }) => data)
  .handler(async ({ data }) => {
    const session = await getSessionFn();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Check if slug is already taken
    const existing = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, data.slug))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Organization slug already taken");
    }

    // Generate API key
    const apiKey = `pk_${crypto.randomUUID().replace(/-/g, "")}`;

    // Create organization
    const [org] = await db
      .insert(organization)
      .values({
        name: data.name,
        slug: data.slug,
        apiKey,
        isOnboarded: false,
      })
      .returning();

    // Create owner membership
    await db.insert(membership).values({
      userId: session.user.id,
      organizationId: org.id,
      role: "owner",
    });

    return org;
  });

// Get current organization
export const getCurrentOrganization = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await getSessionFn();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    return session.currentOrganization;
  }
);

// Update organization
export const updateOrganization = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name?: string;
      stripeApiKey?: string;
      stripeWebhookSecret?: string;
      isOnboarded?: boolean;
    }) => data
  )
  .handler(async ({ data }) => {
    const session = await getSessionFn();

    if (!session?.user || !session.currentOrganization) {
      throw new Error("Unauthorized");
    }

    const [updated] = await db
      .update(organization)
      .set(data)
      .where(eq(organization.id, session.currentOrganization.id))
      .returning();

    return updated;
  });
