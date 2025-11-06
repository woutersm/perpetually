import {
  useLoaderData,
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";
import { asc, eq } from "drizzle-orm";
import invariant from "tiny-invariant";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { db } from "@perpetually/db/config";
import { customerSchema, licenseSchema, teamSchema } from "@perpetually/db/schema";
import { toShortDate } from "@perpetually/db/utils";
import { z } from "zod";
import { Status } from "~/components/Status";
import { parseWithZod } from "@conform-to/zod";
import { generateNewLicenseKey } from "@perpetually/db/models";

export const schema = z.object({
  licenseId: z.string(),
});

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const { customerId } = params;
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  invariant(customerId, "no customerId in portal action");

  const license = await db.query.licenseSchema.findFirst({
    where: eq(licenseSchema.id, submission.value.licenseId),
    with: {
      team: {
        with: {
          secretKeys: { columns: { secretKey: true } },
        },
      },
    },
  });

  invariant(
    license?.team.secretKeys?.secretKey,
    "no secret key in portal action"
  );

  await generateNewLicenseKey({
    licenseId: submission.value.licenseId,
    secretKey: license.team.secretKeys?.secretKey,
  });

  return {};
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { slug, customerId } = params;
  invariant(customerId, "no customerId in portal");

  const team = await db.query.teamSchema.findFirst({
    where: eq(teamSchema.slug, slug ?? ""),
  });

  invariant(team, "no team found for portal");

  const customer = await db.query.customerSchema.findFirst({
    where: eq(customerSchema.id, customerId),
    with: {
      licenses: {
        where: eq(licenseSchema.teamId, team.id),
        with: {
          product: {
            with: { team: { columns: { name: true, slug: true } } },
          },
        },
        orderBy: [asc(licenseSchema.status)],
      },
    },
  });

  invariant(customer, "no customer found for portal");

  return { customer };
}

function GenerateNewKey({
  licenseId,
  status,
}: {
  licenseId: string;
  status: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={status !== "ACTIVE"}>
          Generate new key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="mb-4">Generate new key</DialogTitle>
          <DialogDescription>
            This will invalidate your current key and generate a new one. Are
            you sure?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <form method="post">
            <input hidden readOnly value={licenseId} name="licenseId"></input>
            <Button type="submit" variant="destructive">
              Yes, generate a new key
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShowKey({ licenseKey }: { licenseKey: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Show key</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="mb-4">Your key</DialogTitle>
        </DialogHeader>
        <Textarea
          className="resize-none"
          rows={3}
          value={licenseKey}
          readOnly
        ></Textarea>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            autoFocus // eslint-disable-line
            onClick={() => {
              navigator.clipboard.writeText(licenseKey);
            }}
          >
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UserPortal() {
  const { customer } = useLoaderData<typeof loader>();
  console.log("customer in ui", customer);

  return (
    <div>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Licenses</h3>
        </div>
        <Separator />
      </div>

      <ul className="space-y-8 mt-8">
        {customer.licenses.map((l: typeof licenseSchema.$inferSelect & { product: any }) => {
          return (
            <li key={l.id}>
              <Card className="p-10 space-y-6">
                <CardHeader>
                  <div className="flex justify-between mb-2">
                    <CardTitle>{l.product.name}</CardTitle>
                    <Status status={l.status} />
                  </div>
                  <CardDescription>{l.product.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    This icense is valid until: {toShortDate(l.expiresAt)}.
                  </CardDescription>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <ShowKey licenseKey={l.key} />
                  <GenerateNewKey licenseId={l.id} status={l.status} />
                </CardFooter>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
