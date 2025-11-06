import { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, useLoaderData } from "react-router";
import { and, desc, eq } from "drizzle-orm";
import { requireUser } from "~/auth.server";
import { db } from "@perpetually/db/config";
import { productSchema, releaseSchema } from "@perpetually/db/schema";
import invariant from "tiny-invariant";
import { Button } from "~/components/ui/button";
import clsx from "clsx";
import { toLongDate, toShortDate } from "@perpetually/db/utils";
import { Menu, Transition } from "@headlessui/react";
import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";

import { Fragment } from "react";
import { Page } from "~/components/Page";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { LicensePolicy } from "~/components/LicensePolicy";
import { DetailsHeader } from "~/components/DetailsHeader";
import { Details } from "~/components/Detail";
import { DetailsTableWrapper } from "~/components/DetailsTableWrapper";
import { Text, TextLink } from "~/components/Text";
import { Status } from "~/components/Status";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const releaseId = formData.get("releaseId")?.toString();

  invariant(
    releaseId,
    "no releaseId in product detail action -> delete release"
  );

  return await db
    .delete(releaseSchema)
    .where(eq(releaseSchema.id, releaseId))
    .execute();
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { productId } = params;
  invariant(productId, "no productId in product detail page");
  const user = await requireUser(request);

  const product = await db.query.productSchema.findFirst({
    where: and(
      eq(productSchema.teamId, user?.teamId),
      eq(productSchema.id, productId)
    ),
    with: {
      licenses: { columns: { id: true } },
      releases: { orderBy: desc(releaseSchema.createdAt) },
      licensePolicies: true,
    },
  });

  invariant(product, "no product in product detail page");

  return { product };
}

export default function ProductDetail() {
  const { product } = useLoaderData<typeof loader>();

  return (
    <Page backTitle="products">
      <DetailsHeader>
        <div>
          <div className="flex flex-col gap-y-4">
            <div className="flex justify-between text-sm leading-6 text-gray-500">
              <span className="font-semibold text-gray-900 leading-6 text-lg">
                {product.name}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-x-4 sm:gap-x-6">
          <Link to={`/products/${product.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
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
                      Edit
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </DetailsHeader>

      <Details>
        <LicensePolicy policy={product.licensePolicies?.[0]} />

        <DetailsTableWrapper>
          <div className="font-semibold text-lg leading-6 text-gray-900 border-b-2 pb-2">
            Details
          </div>
          <div className="mt-4 grid max-w-2xl grid-cols-2 text-base text-gray-700 gap-y-4">
            <div className="text-sm font-semibold leading-6 text-gray-900">
              Name
            </div>
            <Text>{product.name}</Text>

            <div className="text-sm font-semibold leading-6 text-gray-900">
              Stripe Product ID
            </div>
            <Text>{product.stripeProductId}</Text>

            <div className="text-sm font-semibold leading-6 text-gray-900">
              Description
            </div>

            <Text>{product.description}</Text>

            <div className="text-sm font-semibold leading-6 text-gray-900">
              Status
            </div>
            <Status status={product.status} />

            <div className="text-sm font-semibold leading-6 text-gray-900">
              Created
            </div>
            <Text>{toShortDate(product.createdAt)}</Text>
            <div className="text-sm font-semibold leading-6 text-gray-900">
              Licenses
            </div>
            <TextLink
              href={`/licenses?product=${product.name}`}
              className="text-sm text-indigo-600 underline underline-offset-2"
            >
              <div className="sm:max-w-md md:max-w-lg">
                {product.licenses.length} licenses
              </div>
            </TextLink>
          </div>

          <div className="flex justify-between mt-20 border-b-2 pb-2 items-center">
            <div className="font-semibold text-lg leading-6 text-gray-900">
              Releases
            </div>
            <Link to={`/products/${product.id}/releases/new`}>
              <Button size="sm" variant="outline">
                Create release
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
                  Tag
                </th>
                <th scope="col" className="py-3 pl-8 pr-0 font-semibold">
                  Released at
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
              {product.releases.length === 0 ? (
                <tr className="border-t border-gray-100 mr-2">
                  <td className="max-w-0 px-0 py-5 align-top">
                    <div className="truncate font-medium tabular-nums text-gray-900">
                      No releases yet
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {product.releases.map((r: typeof releaseSchema.$inferSelect) => (
                    <tr key={r.id} className="items-center">
                      <td className="max-w-0 px-0 py-5 align-top">
                        <div className="truncate font-medium tabular-nums text-gray-900">
                          {r.tag}
                        </div>
                        <div className="truncate text-gray-500">
                          {r.description}
                        </div>
                      </td>
                      <td className="py-5 pl-8 pr-0 text-right align-top tabular-nums text-gray-700">
                        {toLongDate(r.createdAt)}
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
                            <Link
                              to={`/products/${product.id}/releases/${r.id}/edit`}
                            >
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                            </Link>
                            <Form method="post">
                              <input
                                name="releaseId"
                                hidden
                                value={r.id}
                                readOnly
                              />
                              <button type="submit" className="w-full">
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
        </DetailsTableWrapper>
      </Details>
    </Page>
  );
}
