import { Customer, License, Team } from "@perpetually/db/schema";
import { Text, TextLink } from "./Text";
import { toShortDate } from "@perpetually/db/utils";

export function CustomerCard({
  customer,
  slug,
}: {
  customer: Customer & { licenses: License[] };
  slug: string;
}) {
  return (
    <div className="lg:col-start-3 lg:row-end-1">
      <div className="rounded-lg bg-gray-50 py-6 shadow-sm ring-1 ring-gray-900/5">
        <dl className="flex flex-wrap">
          <div className="flex-auto flex justify-between px-6 items-center">
            <div className="font-semibold leading-6 text-gray-900">
              Customer
            </div>
          </div>
          <div className="mt-4 flex flex-col w-full gap-x-4 px-6">
            <dt className="text-sm font-semibold leading-6 text-gray-900">
              Name
            </dt>
            <Text>{customer.name}</Text>
          </div>
          <div className="mt-4 flex flex-col w-full gap-x-4 px-6">
            <dt className="text-sm font-semibold leading-6 text-gray-900">
              Email
            </dt>
            <Text>{customer.email}</Text>
          </div>
          <div className="mt-4 flex flex-col w-full gap-x-4 px-6">
            <dt className="text-sm font-semibold leading-6 text-gray-900">
              Created
            </dt>
            <Text>{toShortDate(customer.createdAt)}</Text>
          </div>
          <div className="mt-4 flex flex-col w-full gap-x-4 px-6">
            <dt className="text-sm font-semibold leading-6 text-gray-900">
              Total licenses
            </dt>
            <TextLink
              className="text-sm"
              href={`/licenses?customer=${customer.email.toLowerCase()}`}
            >
              {customer.licenses.length}
            </TextLink>
          </div>
          <div className="mt-4 flex flex-col w-full gap-x-4 px-6">
            <dt className="text-sm font-semibold leading-6 text-gray-900">
              Customer portal
            </dt>
            <TextLink
              className="text-sm"
              href={`/portal/${slug}/${customer.id}`}
            >
              portal
            </TextLink>
          </div>
        </dl>
      </div>
    </div>
  );
}
