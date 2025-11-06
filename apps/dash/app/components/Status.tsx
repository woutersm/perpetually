import clsx from "clsx";

// todo: do we need to split for products and licenses?
export const statuses = [
  {
    value: "ACTIVE",
    label: "Active",
  },
  {
    value: "PENDING",
    label: "Pending",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
  },
  {
    value: "DISABLED",
    label: "Disabled",
  },
  {
    value: "EXPIRED",
    label: "Expired",
  },
];

export function Status({ status }: { status: string }) {
  const s = statuses.find((s) => s.value === status);

  if (!s) {
    return null;
  }

  return (
    <div className="flex items-center">
      <span
        className={clsx(
          status === "ACTIVE" && "bg-green-200 text-green-700",
          status === "INACTIVE" && "bg-stone-200 text-stone-700",
          status === "DISABLED" && "bg-red-200 text-red-700",
          status === "EXPIRED" && "bg-orange-200 text-orange-700",
          status === "PENDING" && "bg-yellow-200 text-yellow-700",
          "px-4 rounded-md text-center w-24 text-sm"
        )}
      >
        {s.label}
      </span>
    </div>
  );
}
