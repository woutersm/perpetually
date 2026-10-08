import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { PageLayout } from "@/components/page-layout";
import { DataTable, DefinitionList, Mono, Section } from "@/components/blocks";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { getCustomer } from "@/functions/customers";
import { formatDate, licenseState } from "@/lib/format";

export const Route = createFileRoute("/_auth/customers/$customerId")({
  component: CustomerDetailPage,
  loader: async ({ params, context }) => {
    const customer = await getCustomer({
      data: { customerId: params.customerId, isTestMode: context.isTestMode },
    });
    return { customer };
  },
});

function CustomerDetailPage() {
  const { customer } = Route.useLoaderData();
  const { organization } = Route.useRouteContext();

  return (
    <PageLayout
      title={customer.name}
      description={customer.email}
      breadcrumbs={[{ label: "Customers", href: "/customers" }, { label: customer.name }]}
      actions={
        organization?.slug && (
          <Button variant="outline" size="sm" asChild>
            <a href={`/portal/${organization.slug}/${customer.id}`} target="_blank" rel="noreferrer">
              Customer portal
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        )
      }
    >
      <div className="max-w-xl">
        <DefinitionList
          items={[
            { label: "Email", value: customer.email },
            { label: "Company", value: customer.company ?? "—" },
            { label: "Customer since", value: formatDate(customer.createdAt) },
            { label: "Stripe customer", value: <Mono>{customer.stripeCustomerId ?? "—"}</Mono> },
          ]}
        />
      </div>

      <Section title="Licenses">
        <DataTable
          rows={customer.licenses}
          rowKey={(l) => l.id}
          href={(l) => `/licenses/${l.id}`}
          empty="No licenses in this mode."
          columns={[
            { header: "License key", width: "minmax(0,2fr)", cell: (l) => <Mono>{l.key}</Mono> },
            { header: "Product", width: "minmax(0,1.5fr)", cell: (l) => <span className="truncate">{l.productName ?? "—"}</span> },
            { header: "Status", width: "7rem", cell: (l) => <Status status={licenseState(l.status, l.expiresAt)} /> },
            { header: "Issued", width: "7rem", cell: (l) => <span className="tabular-nums text-muted-foreground">{formatDate(l.createdAt)}</span> },
            { header: "Expires", width: "7rem", cell: (l) => <span className="tabular-nums text-muted-foreground">{formatDate(l.expiresAt, "Never")}</span> },
          ]}
        />
      </Section>
    </PageLayout>
  );
}
