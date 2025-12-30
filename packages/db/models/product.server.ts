import { desc, eq, getTableName } from "drizzle-orm";
import { db, nanoid } from "../db/config.server";
import { productSchema, releaseSchema, Team } from "../db/schema.server";
import slug from "slug";
import Stripe from "stripe";
import invariant from "tiny-invariant";

export async function createProductsFromStripe(team: Team) {
  invariant(team.stripeApiKey, "no stripe api key");
  const stripeApi = new Stripe(team.stripeApiKey, {
    apiVersion: "2025-10-29.clover",
  });

  const products = await stripeApi.products.search({
    query: "active:'true'",
  });

  for (const product of products.data) {
    await createProductFromStripe({
      teamId: team.id,
      name: product.name,
      description: product.description,
      stripeProductId: product.id,
    });
  }
}

export async function createProductFromStripe({
  name,
  teamId,
  description,
  stripeProductId,
}: {
  name: string;
  teamId: string;
  description: string | null;
  stripeProductId: string;
}) {
  return (
    await db
      .insert(productSchema)
      .values([
        {
          id: nanoid(getTableName(productSchema)),
          slug: slug(name),
          stripeProductId,
          teamId,
          name,
          description,
        },
      ])
      .onConflictDoUpdate({
        target: productSchema.stripeProductId,
        set: {
          name,
          slug: slug(name),
          description,
          updatedAt: new Date().toISOString(),
        },
      })
      .returning()
      .execute()
  )[0];
}

export async function getProducts(teamId: string) {
  const products = await db.query.productSchema.findMany({
    where: eq(productSchema.teamId, teamId),
    with: {
      licenses: { columns: { id: true } },
      releases: { orderBy: desc(releaseSchema.createdAt) },
      licensePolicies: true,
    },
  });

  return products;
}

export async function getStripeProductId(productId: string) {
  const product = await db.query.productSchema.findFirst({
    where: eq(productSchema.id, productId),
  });

  return product?.stripeProductId;
}
