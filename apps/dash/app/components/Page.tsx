import { Link } from "react-router";

export function Page({
  children,
  title,
  button,
  backTitle,
}: {
  children: React.ReactNode;
  backTitle?: string;
  title?: string;
  button?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-none">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold leading-7 text-gray-900 sm:truncate sm:text-2xl sm:tracking-tight">
            {title}
          </h2>
          {button}
        </div>
        {backTitle && (
          <Link
            to={`/${backTitle}`}
            className="px-4 sm:px-6 lg:px-8 font-light text-sm flex items-center"
          >
            &lt; {backTitle}
          </Link>
        )}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
