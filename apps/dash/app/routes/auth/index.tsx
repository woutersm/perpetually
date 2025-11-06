import { Page } from "~/components/Page";
import {
  LoaderFunctionArgs,
  useLoaderData,
  ActionFunctionArgs,
} from "react-router";
import { z } from "zod";
import { requireUserId } from "~/auth.server";
import invariant from "tiny-invariant";
import { Text } from "~/components/Text";
import { Textarea } from "~/components/ui/textarea";
import { getTeam } from "@perpetually/db/models";
import { db } from "@perpetually/db/config";
import { eq } from "drizzle-orm";
import {
  productSchema,
  licenseSchema,
  customerSchema,
  teamSchema,
} from "@perpetually/db/schema";
import { Form } from "react-router";
import { Button } from "~/components/ui/button";

export const schema = z.object({
  apiKey: z.string().optional(),
  webhookSecret: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const { teamId } = await requireUserId(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "resetOnboarding") {
    await db
      .update(teamSchema)
      .set({
        isOnboarded: 0,
        stripeApiKey: null,
        stripeWebhookSecret: null,
      })
      .where(eq(teamSchema.id, teamId))
      .execute();

    return { success: true };
  }

  return null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { teamId } = await requireUserId(request);

  const team = await getTeam({ teamId });

  invariant(team, "no team found in TeamSettings");

  const [productCount, licenseCount, uniqueCustomers] = await Promise.all([
    db.query.productSchema
      .findMany({
        where: eq(productSchema.teamId, teamId),
      })
      .then((products: typeof productSchema.$inferSelect[]) => products.length),
    db.query.licenseSchema
      .findMany({
        where: eq(licenseSchema.teamId, teamId),
      })
      .then((licenses: typeof licenseSchema.$inferSelect[]) => licenses.length),
    db.query.licenseSchema
      .findMany({
        where: eq(licenseSchema.teamId, teamId),
        with: {
          customer: true,
        },
      })
      .then((licenses: Array<typeof licenseSchema.$inferSelect & { customer: typeof customerSchema.$inferSelect }>) => {
        const uniqueCustomerIds = new Set(
          licenses.map((license) => license.customer.id)
        );
        return uniqueCustomerIds.size;
      }),
  ]);

  return { team, productCount, licenseCount, customerCount: uniqueCustomers };
}

export default function Home() {
  const { team, productCount, licenseCount, customerCount } =
    useLoaderData<typeof loader>();

  return (
    <Page title="Home">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">
              Total Products
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {productCount}
            </dd>
          </div>

          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">
              Total Licenses
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {licenseCount}
            </dd>
          </div>

          <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">
              Unique Customers
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {customerCount}
            </dd>
          </div>
        </div>

        <div className="rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Reset Onboarding
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Reset your onboarding state to start over. This will remove your
                Stripe API key and webhook secret.
              </p>
            </div>
            <Form method="post">
              <input type="hidden" name="intent" value="resetOnboarding" />
              <Button type="submit" variant="destructive">
                Reset Onboarding
              </Button>
            </Form>
          </div>
        </div>
      </div>
    </Page>
  );
}
