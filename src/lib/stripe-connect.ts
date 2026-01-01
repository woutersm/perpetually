import Stripe from "stripe";
import db from "@/lib/db/db";
import { organization } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get a Stripe client for a connected account.
 * Returns null if no Stripe connection exists.
 */
export async function getConnectedStripe(
  organizationId: string
): Promise<Stripe | null> {
  const [org] = await db
    .select({
      stripeAccessToken: organization.stripeAccessToken,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!org?.stripeAccessToken) {
    return null;
  }

  return new Stripe(org.stripeAccessToken);
}

/**
 * Refresh the access token using the stored refresh token.
 * Call this if API calls fail with authentication errors.
 */
export async function refreshStripeToken(
  organizationId: string
): Promise<boolean> {
  const platformKey = process.env.STRIPE_SECRET_KEY;
  if (!platformKey) {
    console.error("[Stripe] Platform secret key not configured");
    return false;
  }

  const platformStripe = new Stripe(platformKey);

  const [org] = await db
    .select({ stripeRefreshToken: organization.stripeRefreshToken })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  if (!org?.stripeRefreshToken) {
    console.error("[Stripe] No refresh token available for org:", organizationId);
    return false;
  }

  try {
    const response = await platformStripe.oauth.token({
      grant_type: "refresh_token",
      refresh_token: org.stripeRefreshToken,
    });

    await db
      .update(organization)
      .set({
        stripeAccessToken: response.access_token,
        stripeRefreshToken: response.refresh_token,
      })
      .where(eq(organization.id, organizationId));

    console.log("[Stripe] Token refreshed for org:", organizationId);
    return true;
  } catch (error) {
    console.error("[Stripe] Failed to refresh token:", error);
    return false;
  }
}

/**
 * Execute a Stripe API call with automatic token refresh on auth failure.
 *
 * @example
 * const products = await withStripeRetry(orgId, async (stripe) => {
 *   return stripe.products.list({ limit: 100 });
 * });
 */
export async function withStripeRetry<T>(
  organizationId: string,
  operation: (stripe: Stripe) => Promise<T>
): Promise<T | null> {
  const stripe = await getConnectedStripe(organizationId);
  if (!stripe) {
    console.error("[Stripe] No connection for org:", organizationId);
    return null;
  }

  try {
    return await operation(stripe);
  } catch (error) {
    // Check if it's an authentication error
    if (
      error instanceof Stripe.errors.StripeAuthenticationError ||
      (error instanceof Stripe.errors.StripeError && error.code === "account_invalid")
    ) {
      console.warn("[Stripe] Auth error, attempting token refresh for org:", organizationId);

      const refreshed = await refreshStripeToken(organizationId);
      if (!refreshed) {
        console.error("[Stripe] Token refresh failed, giving up");
        return null;
      }

      // Retry with new token
      const newStripe = await getConnectedStripe(organizationId);
      if (!newStripe) {
        return null;
      }

      try {
        return await operation(newStripe);
      } catch (retryError) {
        console.error("[Stripe] Retry failed after token refresh:", retryError);
        return null;
      }
    }

    // Re-throw non-auth errors
    throw error;
  }
}

/**
 * Clear Stripe connection data when account is deauthorized.
 */
export async function clearStripeConnection(organizationId: string): Promise<void> {
  await db
    .update(organization)
    .set({
      stripeConnectId: null,
      stripeAccessToken: null,
      stripeRefreshToken: null,
      stripeScope: null,
      stripeTokenType: null,
      stripeWebhookSecret: null,
      stripeWebhookEndpointId: null,
    })
    .where(eq(organization.id, organizationId));

  console.log("[Stripe] Connection cleared for org:", organizationId);
}
