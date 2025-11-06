import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";

// import { DataTableViewOptions } from "@/app/examples/tasks/components/data-table-view-options";

import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useLocation, useSearchParams } from "react-router";
import { useEffect } from "react";
import { FilterOption } from "@perpetually/db/types";
import { DataTableFacetedFilterProducts } from "./data-table-faceted-filter-products";
import { statuses } from "~/components/Status";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  productFilterOptions: FilterOption[];
}

export function DataTableToolbar<TData>({
  table,
  productFilterOptions,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const email = new URLSearchParams(location.search).get("customer");

  useEffect(() => {
    // This will run the initial filter for the column
    table.getColumn("email")?.setFilterValue(email);
  }, [table, email]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter by ID.."
          value={(table.getColumn("id")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("id")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Input
          placeholder="Filter by Email.."
          value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table.getColumn("status") && (
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Status"
            options={statuses}
          />
        )}
        {table.getColumn("product") && (
          <DataTableFacetedFilterProducts
            column={table.getColumn("product")}
            title="Product"
            options={productFilterOptions}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              const newSearchParams = new URLSearchParams(searchParams);

              newSearchParams.delete("email");
              newSearchParams.delete("product");

              setSearchParams(newSearchParams);
              table.resetColumnFilters();
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      {/* <DataTableViewOptions table={table} /> */}
    </div>
  );
}
