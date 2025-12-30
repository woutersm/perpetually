import { eq } from "drizzle-orm";
import { data, type ActionFunction } from "react-router";

import Stripe from "stripe";
import invariant from "tiny-invariant";
import { db } from "@perpetually/db/config";
import { teamSchema } from "@perpetually/db/schema";
import { logger } from "@perpetually/db/logger";
import { createLicenseAction } from "@perpetually/db/models";

export const action: ActionFunction = async ({ request, params }) => {
  console.log("incoming webhook");
  const teamId = params.teamId;

  if (!teamId) {
    return data({ error: "Team ID is required" }, { status: 404 });
  }

  const team = await db.query.teamSchema.findFirst({
    where: eq(teamSchema.id, teamId),
  });
  console.log({ team });

  if (!team) {
    return data({ error: "Team is required" }, { status: 400 });
  }

  if (!team.stripeWebhookSecret) {
    return data({ error: "Team is required" }, { status: 400 });
  }

  const payload = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  try {
    const event = Stripe.webhooks.constructEvent(
      payload,
      sig,
      team.stripeWebhookSecret
    );

    invariant(event.type, "event.type is required");
    invariant(team.stripeApiKey, "team.stripeApiKey is required");

    const stripeApi = new Stripe(team.stripeApiKey, {
      apiVersion: "2025-10-29.clover",
    });

    // Handle subscription
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;

      // Get product IDs from line items
      const productIds = invoice.lines.data
        .filter((line) => line.price?.product)
        .map((line) => line.price?.product);

      const customer = await getCustomer(stripeApi, invoice.customer as string);

      logger.info("Processing invoice.payment_succeeded", {
        invoice,
        customer,
        productIds,
      });

      for (const productId of productIds) {
        const { created, license, error } = await createLicenseAction({
          teamId,
          stripeProductId: productId as string,
          name: customer.name ?? "",
          email: customer.email ?? "",
        });

        if (created) {
          logger.info("license created", license);
        } else {
          logger.error("license not created", error);
        }
      }
    } else if (
      // Handle one-time purchase
      event.type === "payment_intent.succeeded" &&
      !event.data.object.invoice
    ) {
      const payment = event.data.object;

      invariant(payment.customer, "payment.customer is required");

      const stripeProductId = payment.metadata.product_id;

      const customer = await getCustomer(stripeApi, payment.customer as string);

      logger.info("Processing payment_intent.succeeded", {
        payment,
        customer,
        stripeProductId,
      });

      const { created, license, error } = await createLicenseAction({
        teamId,
        stripeProductId,
        name: customer.name ?? "",
        email: customer.email ?? "",
      });

      if (created) {
        logger.info("license created", { license });
      } else {
        logger.error("license not created", { error });
      }
    }

    logger.info("done processing Stripe webhook", { teamId, event });

    return data({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Webhook Error:", { error });

    return data({ error: "Webhook Error" }, { status: 400 });
  }
};

async function getCustomer(stripeApi: Stripe, customerId: string) {
  const customer = await stripeApi.customers.retrieve(customerId);

  return customer as Stripe.Customer;
}
