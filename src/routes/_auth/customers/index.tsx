import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, EmptyState } from "@/components/page-layout";
import { getCustomers } from "@/functions/customers";
import {
  Users,
  Mail,
  Building2,
  Calendar,
  ChevronRight,
  CreditCard,
} from "lucide-react";

export const Route = createFileRoute("/_auth/customers/")({
  component: CustomersPage,
  loader: async ({ context }) => {
    const customers = await getCustomers({ data: { isTestMode: context.isTestMode } });
    return { customers };
  },
});

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function CustomersPage() {
  const { customers } = Route.useLoaderData();

  return (
    <PageLayout
      title="Customers"
      description="Your customers synced from Stripe."
      breadcrumbs={[{ label: "Customers" }]}
    >
      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No customers yet"
          description="Customers are automatically created when they make a purchase through Stripe. Once someone buys a license, they'll appear here."
          action={
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Waiting for Stripe purchases...
            </div>
          }
        />
      ) : (
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-4 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
            <div className="col-span-4">Customer</div>
            <div className="col-span-3">Company</div>
            <div className="col-span-2">Licenses</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border/40">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                to="/customers/$customerId"
                params={{ customerId: customer.id }}
                className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors group"
              >
                {/* Customer Name & Email */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-vibrant text-white font-semibold text-sm shadow-lg shadow-vibrant/25">
                    {getInitials(customer.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate group-hover:text-vibrant transition-colors">
                      {customer.name}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      {customer.email}
                    </p>
                  </div>
                </div>

                {/* Company */}
                <div className="col-span-3 flex items-center gap-2 text-sm text-muted-foreground">
                  {customer.company ? (
                    <>
                      <Building2 className="h-4 w-4" />
                      <span className="truncate">{customer.company}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </div>

                {/* Placeholder for future license count */}
                <div className="col-span-2 text-sm text-muted-foreground">
                  —
                </div>

                {/* Joined Date */}
                <div className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Arrow */}
                <div className="col-span-1 flex justify-end">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-vibrant transition-all group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
