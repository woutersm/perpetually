import { ReactNode } from "react";

export function DetailsHeader({ children }: { children: ReactNode }) {
  return (
    <header className="">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-2xl items-start justify-between gap-x-8 lg:mx-0 lg:max-w-none">
          {children}
        </div>
      </div>
    </header>
  );
}
