import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import { DataTable, DefinitionList, Mono, Section } from "@/components/blocks";
import { Status } from "@/components/status";
import { formatDate } from "@/lib/format";
import { getProduct, createLicensePolicy } from "@/functions/products";
import { Button } from "@/components/ui/button";
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

  return (
    <PageLayout
      title={product.name}
      description={product.description || undefined}
      breadcrumbs={[{ label: "Products", href: "/products" }, { label: product.name }]}
    >
      <div className="max-w-xl">
        <DefinitionList
          items={[
            { label: "Status", value: <Status status={product.isActive ? "active" : "inactive"} /> },
            { label: "Licenses issued", value: <span className="tabular-nums">{product.licenseCount}</span> },
            { label: "Stripe product", value: <Mono>{product.stripeProductId ?? "—"}</Mono> },
            { label: "Last synced", value: formatDate(product.syncedAt, "Never") },
          ]}
        />
      </div>

      <Section
        title="License policies"
        description="The first policy sets the duration and device limit for new licenses."
        actions={
          <Button variant="outline" size="sm" onClick={() => setPolicyOpen(true)}>
            New policy
          </Button>
        }
      >
        <DataTable
          rows={product.licensePolicies}
          rowKey={(p) => p.id}
          empty="No policies yet. Licenses default to one year and unlimited devices."
          columns={[
            { header: "Policy", width: "minmax(0,2fr)", cell: (p) => p.name },
            {
              header: "Duration",
              width: "10rem",
              cell: (p) => (p.licenseLengthDays ? `${p.licenseLengthDays} days` : "Perpetual"),
            },
            {
              header: "Devices",
              width: "8rem",
              cell: (p) => (p.activationLimit ? p.activationLimit : "Unlimited"),
            },
          ]}
        />
      </Section>

      {/* New Policy Dialog */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New license policy</DialogTitle>
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
                    <Label htmlFor={field.name}>Policy name</Label>
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
                  <Button type="submit" variant="vibrant" disabled={!canSubmit}>
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
