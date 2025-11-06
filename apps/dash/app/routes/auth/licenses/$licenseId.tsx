import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  Form,
  Link,
  useLoaderData,
} from "react-router";
import { desc, eq } from "drizzle-orm";
import invariant from "tiny-invariant";
import { db } from "@perpetually/db/config";
import {
  activationsSchema,
  licenseSchema,
  releaseSchema,
} from "@perpetually/db/schema";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Page } from "~/components/Page";
import { DetailsHeader } from "~/components/DetailsHeader";
import { DetailsTableWrapper } from "~/components/DetailsTableWrapper";
import { Details } from "~/components/Detail";
import { Menu, Transition } from "@headlessui/react";
import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";
import { Fragment, useState } from "react";
import { toLongDate, toShortDate } from "@perpetually/db/utils";
import { Status } from "~/components/Status";
import clsx from "clsx";
import { Text, TextLink } from "~/components/Text";
import { generateNewLicenseKey } from "@perpetually/db/models";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { CustomerCard } from "~/components/CustomerCard";
import { jsonWithSuccess } from "remix-toast";
import { licenseTypeEnum } from "@perpetually/db/types";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  invariant(intent, "no intent in license detail action");

  switch (intent) {
    case "Activate": {
      const licenseId = formData.get("licenseId")?.toString();
      invariant(licenseId, "no licenseId in license detail action");
      await db
        .update(licenseSchema)
        .set({ status: "ACTIVE" })
        .where(eq(licenseSchema.id, licenseId))
        .execute();
      return jsonWithSuccess({}, `License activated!`);
    }
    case "Deactivate": {
      const licenseId = formData.get("licenseId")?.toString();
      invariant(licenseId, "no licenseId in license detail action");

      await db
        .update(licenseSchema)
        .set({ status: "INACTIVE" })
        .where(eq(licenseSchema.id, licenseId))
        .execute();
      return jsonWithSuccess({}, `License deactivated!`);
    }
    case "Generate": {
      const licenseId = formData.get("licenseId")?.toString();
      invariant(licenseId, "no licenseId in license detail action");

      const license = await db.query.licenseSchema.findFirst({
        where: eq(licenseSchema.id, licenseId),
        with: {
          team: { with: { secretKeys: { columns: { secretKey: true } } } },
        },
      });

      invariant(license, "no product in generate key");
      invariant(
        license.team.secretKeys?.secretKey,
        "no product in generate key"
      );
      await generateNewLicenseKey({
        licenseId: license.id,
        secretKey: license.team.secretKeys.secretKey,
      });
      return jsonWithSuccess({}, `New key generated!`);
    }
    case "Delete activation": {
      const activationId = formData.get("activationId")?.toString();
      const activationName = formData.get("activationName")?.toString();
      invariant(activationId, "no activationId in license index action");

      await db
        .delete(activationsSchema)
        .where(eq(activationsSchema.id, activationId))
        .execute();

      return jsonWithSuccess(
        {},
        `Activation ${activationName || activationId} deleted!`
      );
    }
    default:
      throw Error(`Unkown intent ${intent}`);
  }
}

export async function loader({ params }: LoaderFunctionArgs) {
  const { licenseId } = params;
  invariant(licenseId, "no licenseId in license detail page");

  const license = await db.query.licenseSchema.findFirst({
    where: eq(licenseSchema.id, licenseId),
    with: {
      customer: { with: { licenses: true } },
      product: {
        with: {
          licensePolicies: true,
          releases: { orderBy: desc(releaseSchema.createdAt) },
          team: { columns: { slug: true } },
        },
      },
      activations: { orderBy: desc(activationsSchema.createdAt) },
    },
  });

  invariant(license, "no license found in license detail page");

  return { license };
}

// const activity = [
//   {
//     id: 1,
//     type: "created",
//     person: { name: "Chelsea Hagon" },
//     date: "7d ago",
//     dateTime: "2023-01-23T10:32",
//   },
//   {
//     id: 2,
//     type: "edited",
//     person: { name: "Chelsea Hagon" },
//     date: "6d ago",
//     dateTime: "2023-01-23T11:03",
//   },
//   {
//     id: 3,
//     type: "sent",
//     person: { name: "Chelsea Hagon" },
//     date: "6d ago",
//     dateTime: "2023-01-23T11:24",
//   },
//   {
//     id: 5,
//     type: "viewed",
//     person: { name: "Alex Curren" },
//     date: "2d ago",
//     dateTime: "2023-01-24T09:12",
//   },
//   {
//     id: 6,
//     type: "paid",
//     person: { name: "Alex Curren" },
//     date: "1d ago",
//     dateTime: "2023-01-24T09:20",
//   },
// ];

export default function LicenseDetail() {
  const { license } = useLoaderData<typeof loader>();
  const [open, setOpen] = useState(false);

  const intent = license.status === "ACTIVE" ? "Deactivate" : "Activate";

  return (
    <Page backTitle="licenses">
      <DetailsHeader>
        <div>
          <div className="flex flex-col gap-y-4">
            <div className="flex justify-between text-sm leading-6 text-gray-500">
              <span className="font-semibold text-gray-900 leading-6 text-lg">
                {license.id}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-x-4 sm:gap-x-6">
          <Form method="post">
            <input name="intent" value={intent} readOnly hidden />
            <input name="licenseId" value={license.id} readOnly hidden />
            <Button
              type="submit"
              variant={intent === "Deactivate" ? "destructive" : "outline"}
            >
              {intent}
            </Button>
          </Form>
          <Menu as="div" className="relative sm:hidden">
            <Menu.Button className="-m-3 block p-3">
              <span className="sr-only">More</span>
              <EllipsisVerticalIcon
                className="h-5 w-5 text-gray-500"
                aria-hidden="true"
              />
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-0.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                <Menu.Item>
                  {({ focus }) => (
                    <button
                      type="button"
                      className={clsx(
                        focus ? "bg-gray-50" : "",
                        "block w-full px-3 py-1 text-left text-sm leading-6 text-gray-900"
                      )}
                    >
                      {intent}
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </DetailsHeader>

      <Details>
        <CustomerCard
          customer={license.customer}
          slug={license.product.team.slug}
        />
        <DetailsTableWrapper>
          <div className="font-semibold text-lg leading-6 text-gray-900 border-b-2 pb-2">
            Details
          </div>
          <div className="mt-4 grid max-w-2xl grid-cols-2 text-base text-gray-700 gap-y-4">
            <div className="text-sm leading-6 text-gray-900">Product</div>
            <TextLink
              className="text-sm"
              href={`/products/${license.product.id}`}
            >
              {license.product.name}
            </TextLink>
            <div className="text-sm  leading-6 text-gray-900">Status</div>
            <Status status={license.status} />
            <div className="text-sm leading-6 text-gray-900">Created</div>
            <Text className="font-mono">{toShortDate(license.createdAt)}</Text>
            <div className="text-sm leading-6 text-gray-900">Expiry</div>
            <Text className="font-mono">{toShortDate(license.expiresAt)}</Text>
            <div className="text-sm leading-6 text-gray-900">
              Current release
            </div>
            <Text className="text-sm leading-6 text-gray-900">
              {license.product.releases.length === 0
                ? "No release yet."
                : license.product.releases[0].tag}
            </Text>
            {license.product.licensePolicies[0].activationLimit && (
              <>
                <div className="text-sm leading-6 text-gray-900">
                  Activations
                </div>
                <Text>
                  {license.activations.length} /{" "}
                  {license.product.licensePolicies[0].activationLimit}
                </Text>
              </>
            )}
            <div className="text-sm leading-6 text-gray-900">Type</div>
            {license.product.licensePolicies[0].type ==
              licenseTypeEnum.restrict && (
              <>
                <Text>
                  <span className="font-bold">Restrict</span> access to the
                  latest release while the licenses was not yet expired.
                </Text>
              </>
            )}
            {license.product.licensePolicies[0].type ==
              licenseTypeEnum.revoke && (
              <Text>
                <span className="font-bold">Revoke</span> all access after the
                license has expired.
              </Text>
            )}
          </div>

          <div className="flex justify-between mt-20 border-b-2 pb-2 items-center">
            <div className="font-semibold leading-6 text-lg text-gray-900">
              Key
            </div>
            <Form method="post">
              <input name="intent" hidden value="Generate" readOnly />
              <input name="licenseId" hidden value={license.id} readOnly />
              <Button size="sm" variant="outline">
                Generate new key
              </Button>
            </Form>
          </div>

          <div className="mt-4 grid max-w-2xl grid-cols-2 text-base text-gray-700 gap-y-4">
            <div className="text-sm  leading-6 text-gray-900">Key</div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger className="text-sm text-left text-zinc-950 underline decoration-zinc-950/50 data-[hover]:decoration-zinc-950 dark:text-white dark:decoration-white/50 dark:data-[hover]:decoration-white">
                Show key
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle className="mb-4">Key</DialogTitle>
                </DialogHeader>
                <Textarea
                  className="resize-none"
                  rows={2}
                  value={license.key}
                  readOnly
                ></Textarea>
                <DialogFooter className="mt-4">
                  <Button
                    variant="outline"
                    autoFocus // eslint-disable-line
                    onClick={() => {
                      navigator.clipboard.writeText(license.key);
                      setOpen(false);
                    }}
                  >
                    Copy
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="text-sm  leading-6 text-gray-900">Created</div>
            <Text className="font-mono">
              {toShortDate(license.keyCreatedAt)}
            </Text>
          </div>

          {license.activationLimit && (
            <>
              <div className="flex justify-between mt-20 border-b-2 pb-2 items-center">
                <div className="font-semibold leading-6 text-lg text-gray-900">
                  Activations
                </div>

                <Link to={`/licenses/${license.id}/activations/new`}>
                  <Button size="sm" variant="outline">
                    Create activation
                  </Button>
                </Link>
              </div>

              <table className="w-full whitespace-nowrap text-left text-sm leading-6 mt-4">
                <colgroup>
                  <col className="w-full" />
                  <col />
                  <col />
                </colgroup>
                <thead className="text-gray-900">
                  <tr>
                    <th scope="col" className="px-0 py-3 font-semibold">
                      Name
                    </th>
                    <th scope="col" className="py-3 pl-8 pr-0 font-semibold">
                      Activated at
                    </th>
                    <th
                      scope="col"
                      className="py-3 pl-8 pr-0 text-right font-semibold"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {license.activations.length === 0 ? (
                    <tr className="border-t border-gray-100 mr-2">
                      <td className="max-w-0 px-0 py-5 align-top">
                        <div className="truncate font-medium tabular-nums text-gray-900">
                          No activations yet
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {license.activations.map((a: typeof activationsSchema.$inferSelect) => (
                        <tr key={a.id} className="items-center">
                          <td className="max-w-0 px-0 py-5 align-top">
                            <div className="truncate font-medium tabular-nums text-gray-900">
                              {a.name}
                            </div>
                          </td>
                          <td className="py-5 pl-8 pr-0 text-right align-top tabular-nums text-gray-700">
                            {toLongDate(a.createdAt)}
                          </td>
                          <td className="py-5 pl-8 pr-0 text-right align-top">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
                                >
                                  <DotsHorizontalIcon className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-[160px]"
                              >
                                <Form method="post">
                                  <input
                                    name="releaseId"
                                    hidden
                                    value={a.id}
                                    readOnly
                                  />
                                  <button type="submit" className="w-full">
                                    <input
                                      name="intent"
                                      value="Delete activation"
                                      readOnly
                                      hidden
                                    />
                                    <input
                                      name="activationId"
                                      value={a.id}
                                      readOnly
                                      hidden
                                    />

                                    <input
                                      name="activationName"
                                      value={a.name || ""}
                                      readOnly
                                      hidden
                                    />
                                    <DropdownMenuItem>Delete</DropdownMenuItem>
                                  </button>
                                </Form>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </>
          )}
        </DetailsTableWrapper>
      </Details>
    </Page>
  );
}
