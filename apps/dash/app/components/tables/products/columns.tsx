import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { License, LicensePolicy, Product, Release } from "@perpetually/db/schema";

import { Status } from "~/components/Status";

type ColumnProduct = Product & {
  releases: Release[];
  licenses: Pick<License, "id">[];
  licensePolicies: LicensePolicy[];
};

export const columns: ColumnDef<ColumnProduct>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.getValue("id")}</div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader className="pl-2" column={column} title="Name" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center pl-2">
          <span>{row.original.name}</span>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      return (
        <Status
          status={
            row.original.licensePolicies.length > 0 ? "ACTIVE" : "PENDING"
          }
        />
      );
    },
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center">
          <span>
            {row.original.licensePolicies[0]?.type.toLowerCase() ?? "-"}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "release",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last release" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center">
          <span>
            {row.original.releases.length > 0
              ? row.original.releases[0].tag
              : ""}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "activation limit",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Activation Limit" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center">
          <span>{row.original.licensePolicies[0]?.activationLimit ?? "-"}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "licenses",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Licenses" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center">
          <span>{row.original.licenses.length ?? 0}</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
