import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import { getProduct, createLicensePolicy } from "@/functions/products";
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
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { Plus, Package, Key, FileText, Layers, Clock, Infinity } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/products/$productId")({
  component: ProductDetailPage,
  loader: async ({ params }) => {
    const product = await getProduct({ data: { productId: params.productId } });
    return { product };
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

function ProductDetailPage() {
  const { product } = Route.useLoaderData();
  const router = useRouter();
  const [policyOpen, setPolicyOpen] = useState(false);

  const submitPolicy = useServerFn(createLicensePolicy);

  const policyForm = useForm({
    defaultValues: {
      name: "",
      licenseLengthDays: "",
      activationLimit: "",
    },
    onSubmit: async ({ value }) => {
      await submitPolicy({
        data: {
          productId: product.id,
          name: value.name,
          licenseLengthDays: value.licenseLengthDays
            ? parseInt(value.licenseLengthDays)
            : undefined,
          activationLimit: value.activationLimit
            ? parseInt(value.activationLimit)
            : undefined,
        },
      });
      setPolicyOpen(false);
      policyForm.reset();
      toast.success("License policy created");
      router.invalidate();
    },
  });

  const getStatusVariant = (isActive: boolean) => {
    return isActive ? "outline-success" : "secondary";
  };

  return (
    <PageLayout
      title={product.name}
      description={product.description || undefined}
      breadcrumbs={[
        { label: "Products", href: "/products" },
        { label: product.name },
      ]}
    >
      <div className="space-y-6 max-w-5xl">
        {/* Hero Header */}
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <div className="bg-gradient-to-br from-vibrant/5 via-transparent to-transparent p-6">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-vibrant text-white shadow-lg shadow-vibrant/25">
                <Package className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{product.name}</h1>
                  <Badge variant={getStatusVariant(product.isActive)}>
                    {product.isActive ? "active" : "inactive"}
                  </Badge>
                </div>
                {product.description && (
                  <p className="text-muted-foreground">{product.description}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Created {new Date(product.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border/60 p-5 hover:border-vibrant/40 hover:shadow-lg hover:shadow-vibrant/5 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vibrant/10">
                <Key className="h-5 w-5 text-vibrant" />
              </div>
              <span className="text-sm text-muted-foreground">Licenses</span>
            </div>
            <p className="text-3xl font-bold">{product.licenseCount}</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-5 hover:border-vibrant/40 hover:shadow-lg hover:shadow-vibrant/5 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vibrant/10">
                <Layers className="h-5 w-5 text-vibrant" />
              </div>
              <span className="text-sm text-muted-foreground">Policies</span>
            </div>
            <p className="text-3xl font-bold">{product.licensePolicies.length}</p>
          </div>
        </div>

        {/* License Policies */}
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <div className="border-b border-border/40 bg-muted/30 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vibrant/10">
                <Layers className="h-5 w-5 text-vibrant" />
              </div>
              <div>
                <h2 className="font-semibold">License Policies</h2>
                <p className="text-sm text-muted-foreground">
                  Templates for issuing licenses to customers
                </p>
              </div>
            </div>
            <Button variant="vibrant" size="sm" onClick={() => setPolicyOpen(true)} className="shadow-lg shadow-vibrant/25">
              <Plus className="h-4 w-4" />
              New Policy
            </Button>
          </div>
          {product.licensePolicies.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
                <Layers className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No license policies yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create a policy to define license terms.
              </p>
              <Button variant="vibrant" onClick={() => setPolicyOpen(true)} className="shadow-lg shadow-vibrant/25">
                <Plus className="h-4 w-4" />
                Create Policy
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {product.licensePolicies.map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{policy.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {policy.licenseLengthDays ? `${policy.licenseLengthDays} days` : "Perpetual"}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
                      {policy.activationLimit ? (
                        <>
                          <Key className="h-4 w-4" />
                          {policy.activationLimit} devices
                        </>
                      ) : (
                        <>
                          <Infinity className="h-4 w-4" />
                          Unlimited
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Policy Dialog */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant/10 mb-4">
              <Layers className="h-6 w-6 text-vibrant" />
            </div>
            <DialogTitle>Create License Policy</DialogTitle>
            <DialogDescription>
              Define a template for issuing licenses.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              policyForm.handleSubmit();
            }}
          >
            <div className="space-y-4 py-4">
              <policyForm.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Name is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Policy Name</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Annual Pro"
                      className="h-11"
                      ignorePasswordManagers
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </policyForm.Field>

              <policyForm.Field name="licenseLengthDays">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Duration (days) <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id={field.name}
                      type="number"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Leave empty for perpetual"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for perpetual licenses that never expire
                    </p>
                  </div>
                )}
              </policyForm.Field>

              <policyForm.Field name="activationLimit">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Activation Limit <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id={field.name}
                      type="number"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Leave empty for unlimited"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of devices this license can activate on
                    </p>
                  </div>
                )}
              </policyForm.Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPolicyOpen(false)}
              >
                Cancel
              </Button>
              <policyForm.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" variant="vibrant" disabled={!canSubmit} className="shadow-lg shadow-vibrant/25">
                    {isSubmitting ? "Creating..." : "Create Policy"}
                  </Button>
                )}
              </policyForm.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
