import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import db from "@/lib/db/db";
import { organization, product, customer, license } from "@/lib/db/schema";

// Generate license key (e.g., XXXX-XXXX-XXXX-XXXX)
function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = 4;
  const segmentLength = 4;

  const parts: string[] = [];
  for (let i = 0; i < segments; i++) {
    let segment = "";
    for (let j = 0; j < segmentLength; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(segment);
  }

  return parts.join("-");
}

async function createLicenseFromPayment({
  organizationId,
  stripeProductId,
  stripeCustomerId,
  stripe,
}: {
  organizationId: string;
  stripeProductId: string;
  stripeCustomerId: string;
  stripe: Stripe;
}) {
  // Get Stripe customer
  const stripeCustomer = (await stripe.customers.retrieve(
    stripeCustomerId
  )) as Stripe.Customer;

  // Find or create local product
  let [localProduct] = await db
    .select()
    .from(product)
    .where(eq(product.stripeProductId, stripeProductId))
    .limit(1);

  if (!localProduct) {
    // Try to get product info from Stripe
    const stripeProduct = await stripe.products.retrieve(stripeProductId);

    const slug = stripeProduct.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    [localProduct] = await db
      .insert(product)
      .values({
        name: stripeProduct.name,
        slug: `${slug}-${Date.now()}`,
        description: stripeProduct.description || undefined,
        status: "active",
        stripeProductId,
        organizationId,
      })
      .returning();

    console.log("Created product from webhook:", localProduct.name);
  }

  // Find or create local customer
  let [localCustomer] = await db
    .select()
    .from(customer)
    .where(eq(customer.email, stripeCustomer.email || ""))
    .limit(1);

  if (!localCustomer && stripeCustomer.email) {
    [localCustomer] = await db
      .insert(customer)
      .values({
        name: stripeCustomer.name || stripeCustomer.email,
        email: stripeCustomer.email,
        organizationId,
      })
      .returning();

    console.log("Created customer from webhook:", localCustomer.name);
  }

  if (!localCustomer) {
    console.error("Could not create or find customer");
    return;
  }

  // Create license
  const key = generateLicenseKey();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year default

  const [newLicense] = await db
    .insert(license)
    .values({
      key,
      keyCreatedAt: now,
      status: "active",
      expiresAt,
      productId: localProduct.id,
      customerId: localCustomer.id,
      organizationId,
    })
    .returning();

  console.log("Created license from webhook:", {
    key: newLicense.key,
    product: localProduct.name,
    customer: localCustomer.email,
  });

  return newLicense;
}

export const Route = createFileRoute("/api/hooks/$organizationId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { organizationId } = params;

        console.log("Webhook received for organization:", organizationId);

        if (!organizationId) {
          return new Response(
            JSON.stringify({ error: "Organization ID is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Get organization
        const [org] = await db
          .select()
          .from(organization)
          .where(eq(organization.id, organizationId))
          .limit(1);

        if (!org) {
          return new Response(
            JSON.stringify({ error: "Organization not found" }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        if (!org.stripeWebhookSecret) {
          return new Response(
            JSON.stringify({ error: "Webhook not configured" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const payload = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
          return new Response(JSON.stringify({ error: "Missing signature" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          // Verify webhook signature
          const event = Stripe.webhooks.constructEvent(
            payload,
            signature,
            org.stripeWebhookSecret
          );

          if (!org.stripeAccessToken) {
            console.error(
              "Stripe not connected for organization:",
              organizationId
            );
            return new Response(
              JSON.stringify({ error: "Stripe not connected" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          const stripe = new Stripe(org.stripeAccessToken, {
            apiVersion: "2025-02-24.acacia",
          });

          // Handle different event types
          if (
            event.type === "payment_intent.succeeded" &&
            !event.data.object.invoice
          ) {
            // One-time payment
            const payment = event.data.object;

            if (!payment.customer) {
              console.log("Payment has no customer, skipping");
              return new Response(JSON.stringify({ received: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }

            const stripeProductId = payment.metadata?.product_id;
            if (!stripeProductId) {
              console.log("Payment has no product_id in metadata, skipping");
              return new Response(JSON.stringify({ received: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }

            await createLicenseFromPayment({
              organizationId,
              stripeProductId,
              stripeCustomerId: payment.customer as string,
              stripe,
            });
          } else if (event.type === "invoice.payment_succeeded") {
            // Subscription payment
            const invoice = event.data.object;

            if (!invoice.customer) {
              console.log("Invoice has no customer, skipping");
              return new Response(JSON.stringify({ received: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }

            // Get product IDs from line items
            const productIds = invoice.lines.data
              .filter((line) => line.price?.product)
              .map((line) => line.price?.product as string);

            for (const stripeProductId of productIds) {
              await createLicenseFromPayment({
                organizationId,
                stripeProductId,
                stripeCustomerId: invoice.customer as string,
                stripe,
              });
            }
          }

          console.log("Webhook processed successfully:", event.type);

          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Webhook error:", error);
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Webhook Error",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
