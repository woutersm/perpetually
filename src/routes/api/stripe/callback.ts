import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import db from "@/lib/db/db";
import { organization } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/stripe/callback?code=xxx&state=organizationId
// Exchanges code for access token, creates webhook, stores credentials
export const Route = createFileRoute("/api/stripe/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const organizationId = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        const appUrl = process.env.APP_URL || "http://localhost:3000";

        // Handle OAuth errors (user denied, etc.)
        if (error) {
          console.error("Stripe OAuth error:", error, errorDescription);
          return Response.redirect(
            `${appUrl}/onboarding/1?error=${encodeURIComponent(errorDescription || error)}`,
            302
          );
        }

        if (!code || !organizationId) {
          return Response.redirect(
            `${appUrl}/onboarding/1?error=missing_params`,
            302
          );
        }

        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
          return Response.redirect(
            `${appUrl}/onboarding/1?error=server_config_error`,
            302
          );
        }

        try {
          // Exchange code for access token using platform's secret key
          const stripe = new Stripe(stripeSecretKey);

          const response = await stripe.oauth.token({
            grant_type: "authorization_code",
            code,
          });

          const {
            access_token,
            refresh_token,
            stripe_user_id,
            scope,
            token_type,
          } = response;

          if (!access_token || !stripe_user_id) {
            throw new Error("Invalid OAuth response from Stripe");
          }

          // Create Stripe client with connected account's token
          const connectedStripe = new Stripe(access_token);

          // Create webhook endpoint programmatically
          const webhookUrl = `${appUrl}/api/hooks/${organizationId}`;

          const webhookEndpoint = await connectedStripe.webhookEndpoints.create(
            {
              url: webhookUrl,
              enabled_events: [
                "checkout.session.completed",
                "payment_intent.succeeded",
                "invoice.payment_succeeded",
                "customer.subscription.created",
                "customer.subscription.updated",
                "customer.subscription.deleted",
              ],
            }
          );

          // Store everything in database
          await db
            .update(organization)
            .set({
              stripeConnectId: stripe_user_id,
              stripeAccessToken: access_token,
              stripeRefreshToken: refresh_token,
              stripeScope: scope,
              stripeTokenType: token_type,
              stripeConnectedAt: new Date(),
              stripeWebhookSecret: webhookEndpoint.secret,
              stripeWebhookEndpointId: webhookEndpoint.id,
            })
            .where(eq(organization.id, organizationId));

          console.log("Stripe Connect OAuth successful:", {
            organizationId,
            stripeConnectId: stripe_user_id,
            webhookEndpointId: webhookEndpoint.id,
          });

          // Redirect to import step
          return Response.redirect(`${appUrl}/onboarding/import`, 302);
        } catch (err) {
          console.error("Stripe OAuth error:", err);
          const errorMessage =
            err instanceof Error ? err.message : "oauth_failed";
          return Response.redirect(
            `${appUrl}/onboarding/1?error=${encodeURIComponent(errorMessage)}`,
            302
          );
        }
      },
    },
  },
});
