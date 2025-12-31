import { ReactNode } from "react";

export function Details({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

export function DetailsHeader({ children }: { children: ReactNode }) {
  return (
    <header>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-2xl items-start justify-between gap-x-8 lg:mx-0 lg:max-w-none">
          {children}
        </div>
      </div>
    </header>
  );
}

export function DetailsTableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 px-4 py-6 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2 xl:px-16 xl:pb-20">
      {children}
    </div>
  );
}

export function DetailsCard({ children }: { children: ReactNode }) {
  return (
    <div className="lg:col-start-3 lg:row-end-1">
      <div className="rounded-lg bg-gray-50 dark:bg-gray-900 py-6 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700">
        {children}
      </div>
    </div>
  );
}

export function DetailsCardHeader({
  title,
  action
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex-auto flex justify-between px-6 items-center">
      <div className="font-semibold leading-6 text-gray-900 dark:text-gray-100">
        {title}
      </div>
      {action}
    </div>
  );
}

export function DetailsCardItem({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-col w-full gap-x-4 px-6">
      <dt className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
        {label}
      </dt>
      <dd className="text-sm text-gray-500 dark:text-gray-400">
        {children}
      </dd>
    </div>
  );
}
