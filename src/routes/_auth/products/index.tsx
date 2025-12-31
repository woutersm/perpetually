import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, EmptyState } from "@/components/page-layout";
import { getProducts, createProduct } from "@/functions/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { Plus, Package, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_auth/products/")({
  component: ProductsPage,
  loader: async () => {
    const products = await getProducts();
    return { products };
  },
});

function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {field.state.meta.isTouched && !field.state.meta.isValid && (
        <p className="text-sm text-destructive mt-1">
          {field.state.meta.errors.join(", ")}
        </p>
      )}
    </>
  );
}

function ProductsPage() {
  const { products } = Route.useLoaderData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const submit = useServerFn(createProduct);

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
      description: "",
    },
    onSubmit: async ({ value }) => {
      const result = await submit({
        data: {
          name: value.name,
          slug: value.slug,
          description: value.description || undefined,
        },
      });

      if (result) {
        setOpen(false);
        form.reset();
        router.invalidate();
      }
    },
  });

  const handleNameChange = (value: string, field: AnyFieldApi) => {
    field.handleChange(value);
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    form.setFieldValue("slug", slug);
  };

  return (
    <PageLayout
      title="Products"
      description="Manage your software products and their license configurations."
      breadcrumbs={[{ label: "Products" }]}
      actions={
        <Button variant="vibrant" onClick={() => setOpen(true)} className="shadow-lg shadow-vibrant/25">
          <Plus className="h-4 w-4" />
          New Product
        </Button>
      }
    >
      {products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="No products yet"
          description="Create your first product to start issuing licenses to your customers."
          action={
            <Button variant="vibrant" onClick={() => setOpen(true)} className="shadow-lg shadow-vibrant/25">
              <Plus className="h-4 w-4" />
              Create Product
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

          {/* Add new product card */}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/10 p-8 transition-all hover:border-vibrant/40 hover:bg-vibrant/5 group min-h-[240px]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted group-hover:bg-vibrant/20 transition-colors">
              <Plus className="h-6 w-6 text-muted-foreground group-hover:text-vibrant transition-colors" />
            </div>
            <span className="mt-4 text-sm font-medium text-muted-foreground group-hover:text-vibrant transition-colors">
              Add Product
            </span>
          </button>
        </div>
      )}

      {/* Create Product Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant/10 mb-4">
              <Package className="h-6 w-6 text-vibrant" />
            </div>
            <DialogTitle>Create Product</DialogTitle>
            <DialogDescription>
              Add a new software product to manage licenses for.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <div className="space-y-4 py-4">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Name is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Product Name</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => handleNameChange(e.target.value, field)}
                      onBlur={field.handleBlur}
                      placeholder="My Awesome App"
                      className="h-11"
                      ignorePasswordManagers
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="slug"
                validators={{
                  onChange: ({ value }) =>
                    !value
                      ? "Slug is required"
                      : !/^[a-z0-9-]+$/.test(value)
                        ? "Only lowercase letters, numbers, and hyphens"
                        : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Slug</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="my-awesome-app"
                      className="font-mono h-11"
                      ignorePasswordManagers
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for API identification
                    </p>
                    <FieldInfo field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field name="description">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Description <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="A brief description of your product"
                      rows={3}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" variant="vibrant" disabled={!canSubmit} className="shadow-lg shadow-vibrant/25">
                    {isSubmitting ? "Creating..." : "Create Product"}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
