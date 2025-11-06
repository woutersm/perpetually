import { ReactNode } from "react";

export function DetailsTableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 px-4 py-6 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2 xl:px-16 xl:pb-20">
      {children}
    </div>
  );
}
