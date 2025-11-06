import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import {
  Activation,
  Customer,
  License,
  LicensePolicy,
  Product,
} from "@perpetually/db/schema";
import { toShortDate } from "@perpetually/db/utils";
import { Status } from "~/components/Status";
import { FilterOption, licenseTypeEnum } from "@perpetually/db/types";

type ColumnType = License & {
  customer: Pick<Customer, "id" | "email">;
} & {
  product: Product & {
    licensePolicies: LicensePolicy[];
  };
  activations: Activation[];
};

export function createColumns(
  productFilterOptions: FilterOption[]
): ColumnDef<ColumnType>[] {
  return [
    // {
    //   id: "select",
    //   header: ({ table }) => (
    //     <Checkbox
    //       checked={
    //         table.getIsAllPageRowsSelected() ||
    //         (table.getIsSomePageRowsSelected() && "indeterminate")
    //       }
    //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
    //       aria-label="Select all"
    //       className="translate-y-[2px]"
    //     />
    //   ),
    //   cell: ({ row }) => (
    //     <Checkbox
    //       checked={row.getIsSelected()}
    //       onCheckedChange={(value) => row.toggleSelected(!!value)}
    //       aria-label="Select row"
    //       className="translate-y-[2px]"
    //     />
    //   ),
    //   enableSorting: false,
    //   enableHiding: false,
    // },
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
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        return <Status status={row.getValue("status")} />;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: "email",
      accessorFn: (row) => row.customer.email,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center lowercase">
          {row.getValue("email")}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "product",
      accessorFn: (row) => row.product.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product" />
      ),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const product = productFilterOptions.find(
          (product) => product.value === row.getValue("product")
        );

        if (!product) {
          return null;
        }

        return (
          <div className="flex items-center">
            <span>{product.label}</span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        if (value) {
          return value.includes(row.getValue(id));
        }
      },
    },
    {
      accessorKey: "activations",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Activations" />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex items-center">
            <span>
              {row.original.activationLimit
                ? `${row.original.activations.length}/${row.original.activationLimit}`
                : "-"}
            </span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "expiry",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Expiry" />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex items-center">
            <span>{toShortDate(row.original.expiresAt)}</span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: "type",
      accessorFn: (row) => row.product.licensePolicies[0].type,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex items-center">
            <span>
              {row.original.product.licensePolicies[0].type ===
              licenseTypeEnum.revoke
                ? "Revoke"
                : "Restrict"}
            </span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions<ColumnType>
          row={row}
          licenseId={row.original.id}
        />
      ),
    },
  ];
}
