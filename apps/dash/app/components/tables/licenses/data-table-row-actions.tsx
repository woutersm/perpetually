import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Form } from "react-router";
import { Row } from "@tanstack/react-table";
import { Button } from "~/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  licenseId: string;
}

export function DataTableRowActions<TData>({
  row,
  // licenseId,
}: DataTableRowActionsProps<TData>) {
  const intent =
    row.getValue("status") === "ACTIVE" ? "Deactivate" : "Activate";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <DotsHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[160px]"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Form method="post" className="w-full">
          <button type="submit" className="w-full">
            <input name="intent" value={intent} readOnly hidden />
            <input
              name="licenseId"
              value={row.getValue("id")}
              readOnly
              hidden
            />
            <DropdownMenuItem>{intent}</DropdownMenuItem>
          </button>
        </Form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
