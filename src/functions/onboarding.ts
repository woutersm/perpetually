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
          isActive: true,
          stripeProductId: stripeProduct.id,
          syncedAt: new Date(),
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

// Connect with restricted API key (alternative to OAuth)
export const connectWithApiKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("connectWithApiKey")])
  .inputValidator((data: { apiKey: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const { apiKey } = data;

    if (!apiKey || (!apiKey.startsWith("rk_") && !apiKey.startsWith("sk_"))) {
      throw new Error(
        "Invalid API key. Use a restricted key (rk_) or secret key (sk_)"
      );
    }

    // Verify the key works by fetching account info
    const stripe = new Stripe(apiKey, {
      apiVersion: "2025-02-24.acacia",
    });

    try {
      const account = await stripe.accounts.retrieve();

      // Store the API key (using same field as OAuth access token)
      await db
        .update(organization)
        .set({
          stripeConnectId: account.id,
          stripeAccessToken: apiKey,
          stripeRefreshToken: null, // No refresh token for API keys
          stripeScope: "api_key", // Mark as API key connection
          stripeTokenType: "api_key",
          stripeConnectedAt: new Date(),
        })
        .where(eq(organization.id, organizationId));

      return {
        success: true,
        accountId: account.id,
      };
    } catch (e) {
      if (e instanceof Stripe.errors.StripeAuthenticationError) {
        throw new Error("Invalid API key. Please check and try again.");
      }
      if (e instanceof Stripe.errors.StripePermissionError) {
        throw new Error(
          "API key doesn't have permission to read account info. Please enable 'Account' read permission."
        );
      }
      throw new Error("Failed to verify API key. Please try again.");
    }
  });

// Test API key connection
export const testApiKeyConnection = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("testApiKeyConnection")])
  .handler(async ({ context: { organizationId } }) => {
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

    try {
      // Try to list products to verify the key works
      const products = await stripe.products.list({ limit: 1 });

      return {
        success: true,
        message: "API key is working",
        productCount: products.data.length,
        hasMore: products.has_more,
      };
    } catch (e) {
      if (e instanceof Stripe.errors.StripeAuthenticationError) {
        throw new Error("API key is invalid or has been revoked");
      }
      if (e instanceof Stripe.errors.StripePermissionError) {
        throw new Error(
          "API key doesn't have permission to read products. Please check your key permissions."
        );
      }
      throw new Error("Failed to connect to Stripe. Please try again.");
    }
  });

// Save webhook secret (manual setup)
export const saveWebhookSecret = createServerFn({ method: "POST" })
  .middleware([authMiddleware, loggingMiddleware("saveWebhookSecret")])
  .inputValidator((data: { webhookSecret: string }) => data)
  .handler(async ({ data, context: { organizationId } }) => {
    const { webhookSecret } = data;

    if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
      throw new Error("Invalid webhook secret. It should start with 'whsec_'");
    }

    await db
      .update(organization)
      .set({ stripeWebhookSecret: webhookSecret })
      .where(eq(organization.id, organizationId));

    return { success: true };
  });

// Get webhook test status (checks if we've received a test event recently)
export const getWebhookTestStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware, loggingMiddleware("getWebhookTestStatus")])
  .handler(async ({ context: { organizationId } }) => {
    const [org] = await db
      .select({
        webhookLastTestedAt: organization.webhookLastTestedAt,
        stripeWebhookSecret: organization.stripeWebhookSecret,
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    return {
      hasWebhookSecret: !!org.stripeWebhookSecret,
      lastTestedAt: org.webhookLastTestedAt,
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
