import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { PageLayout, EmptyState } from "@/components/page-layout";
import { DataTable } from "@/components/blocks";
import { Status } from "@/components/status";
import { getProducts } from "@/functions/products";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_auth/products/")({
  component: ProductsPage,
  loader: async () => {
    const products = await getProducts();
    return { products };
  },
});

function ProductsPage() {
  const { products } = Route.useLoaderData();

  return (
    <PageLayout title="Products" description="Synced from your Stripe account. Edit them in Stripe.">
      {products.length === 0 ? (
        <EmptyState
          icon={<Package className="size-6" />}
          title="No products yet"
          description="Create a product in Stripe and it shows up here within seconds."
        />
      ) : (
        <DataTable
          rows={products}
          rowKey={(p) => p.id}
          href={(p) => `/products/${p.id}`}
          columns={[
            {
              header: "Product",
              width: "minmax(0,2.5fr)",
              cell: (p) => (
                <>
                  <div className="truncate">{p.name}</div>
                  {p.description && <div className="truncate text-xs text-muted-foreground">{p.description}</div>}
                </>
              ),
            },
            { header: "Status", width: "7rem", cell: (p) => <Status status={p.isActive ? "active" : "inactive"} /> },
            {
              header: "Licenses",
              width: "6rem",
              className: "text-right",
              cell: (p) => <span className="tabular-nums">{p.licenseCount}</span>,
            },
            {
              header: "Last synced",
              width: "9rem",
              className: "text-right",
              cell: (p) => <span className="tabular-nums text-muted-foreground">{formatDate(p.syncedAt, "Never")}</span>,
            },
          ]}
        />
      )}
    </PageLayout>
  );
}
