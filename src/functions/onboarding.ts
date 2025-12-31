import { createServerFn } from "@tanstack/react-start";
import { loggingMiddleware } from "@/middleware/logging";
import authMiddleware from "@/middleware/auth";
import db from "@/lib/db/db";
import { organization, product } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

// Import products from Stripe
export const importProductsFromStripe = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("importProductsFromStripe")])
  .handler(async ({ context: { organizationId } }) => {
    // Get organization
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org?.stripeAccessToken) {
      throw new Error("Stripe not connected");
    }

    const stripe = new Stripe(org.stripeAccessToken, {
      apiVersion: "2025-02-24.acacia",
    });

    // Fetch active products from Stripe
    const stripeProducts = await stripe.products.list({
      active: true,
      limit: 100,
    });

    const importedProducts = [];

    for (const stripeProduct of stripeProducts.data) {
      // Check if product already exists
      const existing = await db
        .select()
        .from(product)
        .where(eq(product.stripeProductId, stripeProduct.id))
        .limit(1);

      if (existing.length > 0) {
        continue; // Skip already imported products
      }

      // Create product
      const slug = stripeProduct.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const [newProduct] = await db
        .insert(product)
        .values({
          name: stripeProduct.name,
          slug: `${slug}-${Date.now()}`, // Ensure unique slug
          description: stripeProduct.description || undefined,
          status: "active",
          stripeProductId: stripeProduct.id,
          organizationId,
        })
        .returning();

      importedProducts.push(newProduct);
    }

    // Mark onboarding as complete
    await db
      .update(organization)
      .set({ isOnboarded: true })
      .where(eq(organization.id, organizationId));

    return {
      imported: importedProducts.length,
      total: stripeProducts.data.length,
      products: importedProducts,
    };
  });

// Complete onboarding (skip import)
export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("completeOnboarding")])
  .handler(async ({ context: { organizationId } }) => {
    const [updated] = await db
      .update(organization)
      .set({ isOnboarded: true })
      .where(eq(organization.id, organizationId))
      .returning();

    return updated;
  });

// Get onboarding status
export const getOnboardingStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getOnboardingStatus")])
  .handler(async ({ context: { organizationId } }) => {
    const [org] = await db
      .select({
        id: organization.id,
        stripeConnectId: organization.stripeConnectId,
        stripeAccessToken: organization.stripeAccessToken,
        stripeWebhookSecret: organization.stripeWebhookSecret,
        isOnboarded: organization.isOnboarded,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    return {
      isStripeConnected: !!org.stripeConnectId && !!org.stripeAccessToken,
      hasWebhookSecret: !!org.stripeWebhookSecret,
      isOnboarded: org.isOnboarded,
      organizationId: org.id,
      stripeConnectId: org.stripeConnectId,
    };
  });

// Disconnect Stripe
export const disconnectStripe = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("disconnectStripe")])
  .handler(async ({ context: { organizationId } }) => {
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    // Try to delete webhook endpoint if we have the credentials
    if (org.stripeAccessToken && org.stripeWebhookEndpointId) {
      try {
        const stripe = new Stripe(org.stripeAccessToken, {
          apiVersion: "2025-02-24.acacia",
        });
        await stripe.webhookEndpoints.del(org.stripeWebhookEndpointId);
      } catch (e) {
        // Endpoint may already be deleted, ignore
        console.warn("Failed to delete webhook endpoint:", e);
      }
    }

    // Clear all Stripe Connect fields
    await db
      .update(organization)
      .set({
        stripeConnectId: null,
        stripeAccessToken: null,
        stripeRefreshToken: null,
        stripeScope: null,
        stripeTokenType: null,
        stripeConnectedAt: null,
        stripeWebhookSecret: null,
        stripeWebhookEndpointId: null,
        isOnboarded: false,
      })
      .where(eq(organization.id, organizationId));

    return { success: true };
  });
