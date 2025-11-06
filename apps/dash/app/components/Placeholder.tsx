import { Link } from "react-router";

export function Placeholder({
  to,
  text,
  subText,
}: {
  to: string;
  text: string;
  subText: string;
}) {
  return (
    <div className="mt-10">
      <Link
        to={to}
        className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        <h3 className="mt-2 text-sm font-semibold text-gray-900">{text}</h3>
        <p className="mt-1 text-sm text-gray-500">{subText}</p>
      </Link>
    </div>
  );
}
