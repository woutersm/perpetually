import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, EmptyState } from "@/components/page-layout";
import { getLicenses, createLicense } from "@/functions/licenses";
import { getProducts } from "@/functions/products";
import { getCustomers } from "@/functions/customers";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import {
  Plus,
  Key,
  Copy,
  Check,
  Calendar,
  User,
  Package,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/licenses/")({
  component: LicensesPage,
  loader: async () => {
    const [licenses, products, customers] = await Promise.all([
      getLicenses(),
      getProducts(),
      getCustomers(),
    ]);
    return { licenses, products, customers };
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("License key copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
      title="Copy license key"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

function LicensesPage() {
  const { licenses, products, customers } = Route.useLoaderData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const submit = useServerFn(createLicense);

  const canCreate = products.length > 0 && customers.length > 0;

  const form = useForm({
    defaultValues: {
      productId: "",
      customerId: "",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      activationLimit: "",
    },
    onSubmit: async ({ value }) => {
      const result = await submit({
        data: {
          productId: value.productId,
          customerId: value.customerId,
          expiresAt: value.expiresAt,
          activationLimit: value.activationLimit
            ? parseInt(value.activationLimit)
            : undefined,
        },
      });

      if (result) {
        setOpen(false);
        form.reset();
        router.invalidate();
      }
    },
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "outline-success";
      case "expired":
      case "pending":
        return "outline-warning";
      case "revoked":
      case "suspended":
        return "outline-destructive";
      default:
        return "secondary";
    }
  };

  return (
    <PageLayout
      title="Licenses"
      description="Manage license keys issued to your customers."
      breadcrumbs={[{ label: "Licenses" }]}
      actions={
        <Button
          variant="vibrant"
          onClick={() => setOpen(true)}
          disabled={!canCreate}
          className="shadow-lg shadow-vibrant/25"
        >
          <Plus className="h-4 w-4" />
          New License
        </Button>
      }
    >
      {!canCreate ? (
        <EmptyState
          icon={<Key className="h-8 w-8" />}
          title="Setup required"
          description={
            products.length === 0 && customers.length === 0
              ? "Create a product and customer before issuing licenses."
              : products.length === 0
                ? "Create a product before issuing licenses."
                : "Create a customer before issuing licenses."
          }
          action={
            <div className="flex gap-3">
              {products.length === 0 && (
                <Button variant="outline" asChild>
                  <Link to="/products">Create Product</Link>
                </Button>
              )}
              {customers.length === 0 && (
                <Button variant="outline" asChild>
                  <Link to="/customers">Add Customer</Link>
                </Button>
              )}
            </div>
          }
        />
      ) : licenses.length === 0 ? (
        <EmptyState
          icon={<Key className="h-8 w-8" />}
          title="No licenses yet"
          description="Issue your first license key to a customer."
          action={
            <Button variant="vibrant" onClick={() => setOpen(true)} className="shadow-lg shadow-vibrant/25">
              <Plus className="h-4 w-4" />
              Create License
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-4 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40">
            <div className="col-span-3">License Key</div>
            <div className="col-span-2">Product</div>
            <div className="col-span-2">Customer</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Expires</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border/40">
            {licenses.map((license) => (
              <Link
                key={license.id}
                to="/licenses/$licenseId"
                params={{ licenseId: license.id }}
                className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors group"
              >
                {/* License Key */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted group-hover:bg-vibrant/10 transition-colors">
                    <Key className="h-5 w-5 text-muted-foreground group-hover:text-vibrant transition-colors" />
                  </div>
                  <code className="font-mono text-sm font-medium truncate">
                    {license.key}
                  </code>
                  <CopyButton text={license.key} />
                </div>

                {/* Product */}
                <div className="col-span-2 flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">
                    {license.product?.name || "—"}
                  </span>
                </div>

                {/* Customer */}
                <div className="col-span-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">
                    {license.customer?.name || "—"}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <Badge variant={getStatusVariant(license.status)}>
                    {license.status}
                  </Badge>
                </div>

                {/* Expires */}
                <div className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {license.expiresAt
                      ? new Date(license.expiresAt).toLocaleDateString()
                      : "Never"}
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

      {/* Create License Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant/10 mb-4">
              <Key className="h-6 w-6 text-vibrant" />
            </div>
            <DialogTitle>Create License</DialogTitle>
            <DialogDescription>
              Issue a new license key to a customer.
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
                name="productId"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Product is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={field.handleChange}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldInfo field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="customerId"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Customer is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={field.handleChange}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            <div className="flex flex-col">
                              <span>{customer.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {customer.email}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldInfo field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="expiresAt"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Expiration date is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Expiration Date</Label>
                    <Input
                      id={field.name}
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="h-11"
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </form.Field>

              <form.Field name="activationLimit">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Activation Limit{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id={field.name}
                      type="number"
                      min="1"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Unlimited"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of devices this license can activate on
                    </p>
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
                    {isSubmitting ? "Creating..." : "Create License"}
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
