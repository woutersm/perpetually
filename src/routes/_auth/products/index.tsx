import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, EmptyState } from "@/components/page-layout";
import { getProducts } from "@/functions/products";
import { Badge } from "@/components/ui/badge";
import { Package, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <PageLayout
      title="Products"
      description="Your products synced from Stripe."
      breadcrumbs={[{ label: "Products" }]}
    >
      {products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="No products yet"
          description="Products are automatically synced from your Stripe account. Create a product in Stripe and it will appear here."
          action={
            <Button variant="vibrant" asChild className="shadow-lg shadow-vibrant/25">
              <a
                href="https://dashboard.stripe.com/products/create"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Create in Stripe
              </a>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              to="/products/$productId"
              params={{ productId: product.id }}
              className="group relative flex flex-col rounded-2xl border border-border/60 bg-card p-6 transition-all hover:border-vibrant/40 hover:shadow-xl hover:shadow-vibrant/5"
            >
              {/* Status badge */}
              <div className="absolute right-5 top-5">
                <Badge
                  variant={product.isActive ? "outline-success" : "secondary"}
                >
                  {product.isActive ? "active" : "inactive"}
                </Badge>
              </div>

              {/* Icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted group-hover:bg-gradient-vibrant group-hover:shadow-lg group-hover:shadow-vibrant/25 transition-all">
                <Package className="h-6 w-6 text-muted-foreground group-hover:text-white transition-colors" />
              </div>

              {/* Content */}
              <div className="mt-5 flex-1">
                <h3 className="font-semibold text-lg group-hover:text-vibrant transition-colors">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground font-mono mt-1">
                  {product.slug}
                </p>
                {product.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="mt-5 pt-5 border-t border-border/40 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Created {new Date(product.createdAt).toLocaleDateString()}
                </p>
                <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-vibrant transition-all group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
