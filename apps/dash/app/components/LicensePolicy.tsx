import type { LicensePolicy } from "@perpetually/db/schema";
import { Text } from "./Text";

export function LicensePolicy({ policy }: { policy: LicensePolicy }) {
  return (
    <div className="lg:col-start-3 lg:row-end-1">
      <div className="rounded-lg bg-gray-50 py-6 shadow-sm ring-1 ring-gray-900/5">
        <dl className="flex flex-wrap">
          <div className="flex-auto flex justify-between px-6 items-center">
            <div className="font-semibold leading-6 text-gray-900">
              License Policy
            </div>
          </div>
          <div className="mt-4 flex flex-col w-full gap-x-4 px-6">
            <dt className="text-sm font-semibold leading-6 text-gray-900">
              Type
            </dt>
            <Text>{policy.type}</Text>
          </div>
          <div className="mt-4 flex flex-col w-full gap-x-4 px-6">
            <dt className="text-sm font-semibold leading-6 text-gray-900">
              Licence length
            </dt>
            <Text>{policy.licenseLength} days</Text>
          </div>
          <div className="mt-4 flex flex-col w-full gap-x-4 px-6">
            <dt className="text-sm font-semibold leading-6 text-gray-900">
              Activation limit
            </dt>
            <Text>{policy.activationLimit ?? "No limit set."}</Text>
          </div>
        </dl>
      </div>
    </div>
  );
}
