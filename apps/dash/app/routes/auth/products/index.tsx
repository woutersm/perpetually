import { ActionFunctionArgs, Form, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { desc, eq } from "drizzle-orm";
import { requireUser, requireUserId } from "~/auth.server";
import { db } from "@perpetually/db/config";
import { productSchema, releaseSchema } from "@perpetually/db/schema";
import { Page } from "~/components/Page";
import { Button } from "~/components/ui/button";
import { DataTable } from "~/components/tables/products/data-table";
import { columns } from "~/components/tables/products/columns";
import { createProductFromStripe, getProducts } from "@perpetually/db/models";
import invariant from "tiny-invariant";
import { getTeam } from "@perpetually/db/models";
import Stripe from "stripe";
import { redirectWithSuccess } from "remix-toast";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  const products = await getProducts(user.teamId);

  return { products };
}

export async function action({ request }: ActionFunctionArgs) {
  const { teamId } = await requireUserId(request);

  const team = await getTeam({ teamId });

  invariant(team, "no team found in TeamSettings");

  const stripeApi = new Stripe(team.stripeApiKey ?? "", {
    apiVersion: "2025-10-29.clover",
  });

  const products = await stripeApi.products.search({
    query: "active:'true'",
  });
  for (const product of products.data) {
    await createProductFromStripe({
      teamId,
      name: product.name,
      description: product.description,
      stripeProductId: product.id,
    });
  }

  return redirectWithSuccess("/products", `Products synced!`);
}

export default function Products() {
  const { products } = useLoaderData<typeof loader>();

  const button = (
    <Form method="post">
      <Button variant="outline" type="submit">
        Import products
      </Button>
    </Form>
  );

  return (
    <Page button={button} title="Products">
      <DataTable data={products || []} columns={columns} />
    </Page>
  );
}
