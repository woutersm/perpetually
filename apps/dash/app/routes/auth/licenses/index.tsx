import { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { eq } from "drizzle-orm";
import invariant from "tiny-invariant";
import { requireUser } from "~/auth.server";
import { Page } from "~/components/Page";
import { createColumns } from "~/components/tables/licenses/columns";
import { DataTable } from "~/components/tables/licenses/data-table";
import { db } from "@perpetually/db/config";
import { licenseSchema, productSchema } from "@perpetually/db/schema";
import { activateLicense, disableLicense } from "@perpetually/db/models";
import { jsonWithSuccess } from "remix-toast";
import { Button } from "~/components/ui/button";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  invariant(intent, "no intent in license index action");
  switch (intent) {
    case "Activate": {
      const licenseId = formData.get("licenseId")?.toString();
      invariant(licenseId, "no licenseId in license index action");

      await activateLicense(licenseId);
      return jsonWithSuccess({}, `License ${licenseId} activated!`);
    }
    case "Deactivate": {
      const licenseId = formData.get("licenseId")?.toString();
      invariant(licenseId, "no licenseId in license index action");

      await disableLicense(licenseId);
      return jsonWithSuccess({}, `License ${licenseId} deactivated!`);
    }
    default:
      throw Error(`Unkown intent ${intent}`);
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  const licenses = await db.query.licenseSchema.findMany({
    where: eq(licenseSchema.teamId, user?.teamId),
    with: {
      customer: { columns: { id: true, email: true } },
      product: {
        with: {
          licensePolicies: true,
        },
      },
      activations: true,
    },
  });

  const productFilterOptions = (
    await db.query.productSchema.findMany({
      where: eq(productSchema.teamId, user?.teamId),
      columns: { name: true },
    })
  ).map((p: typeof productSchema.$inferSelect) => {
    return {
      label: p.name,
      value: p.name,
    };
  });

  return { licenses, productFilterOptions };
}

export default function Licenses() {
  const { licenses, productFilterOptions } = useLoaderData<typeof loader>();

  const button = (
    <Link to="/licenses/new">
      <Button variant="outline">Create license</Button>
    </Link>
  );

  return (
    <Page title="Licenses" button={button}>
      <div className="mt-10">
        <DataTable
          data={licenses}
          columns={createColumns(productFilterOptions)}
          productFilterOptions={productFilterOptions}
        />
      </div>
    </Page>
  );
}
