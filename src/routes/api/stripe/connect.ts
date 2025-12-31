import { createFileRoute } from "@tanstack/react-router";

// GET /api/stripe/connect?organizationId=xxx
// Redirects to Stripe OAuth authorization page
export const Route = createFileRoute("/api/stripe/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const organizationId = url.searchParams.get("organizationId");

        if (!organizationId) {
          return new Response("Missing organizationId", { status: 400 });
        }

        const clientId = process.env.STRIPE_CLIENT_ID;
        if (!clientId) {
          return new Response("STRIPE_CLIENT_ID not configured", {
            status: 500,
          });
        }

        const appUrl = process.env.APP_URL || "http://localhost:3000";
        const redirectUri = `${appUrl}/api/stripe/callback`;

        const authUrl = new URL("https://connect.stripe.com/oauth/authorize");
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("scope", "read_write");
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("state", organizationId);

        return Response.redirect(authUrl.toString(), 302);
      },
    },
  },
});
