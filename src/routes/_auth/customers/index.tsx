import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PageLayout, EmptyState } from "@/components/page-layout";
import { DataTable } from "@/components/blocks";
import { getCustomers } from "@/functions/customers";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_auth/customers/")({
  component: CustomersPage,
  loader: async ({ context }) => {
    const customers = await getCustomers({ data: { isTestMode: context.isTestMode } });
    return { customers };
  },
});

function CustomersPage() {
  const { customers } = Route.useLoaderData();

  return (
    <PageLayout title="Customers" description="People who bought one of your products.">
      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="No customers yet"
          description="Customers are added automatically the first time they pay through Stripe."
        />
      ) : (
        <DataTable
          rows={customers}
          rowKey={(c) => c.id}
          href={(c) => `/customers/${c.id}`}
          columns={[
            {
              header: "Customer",
              width: "minmax(0,2fr)",
              cell: (c) => (
                <>
                  <div className="truncate">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                </>
              ),
            },
            {
              header: "Company",
              width: "minmax(0,1.5fr)",
              cell: (c) => <span className="truncate text-muted-foreground">{c.company ?? "—"}</span>,
            },
            {
              header: "Licenses",
              width: "6rem",
              className: "text-right",
              cell: (c) => <span className="tabular-nums">{c.licenseCount}</span>,
            },
            {
              header: "Customer since",
              width: "9rem",
              className: "text-right",
              cell: (c) => <span className="tabular-nums text-muted-foreground">{formatDate(c.createdAt)}</span>,
            },
          ]}
        />
      )}
    </PageLayout>
  );
}
