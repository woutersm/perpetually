import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import { getCustomer, updateCustomer, deleteCustomer } from "@/functions/customers";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { useRouter, useNavigate } from "@tanstack/react-router";
import { Key, Building2, Mail, Edit2, Trash2, Calendar, Plus, ChevronRight, Copy, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/customers/$customerId")({
  component: CustomerDetailPage,
  loader: async ({ params }) => {
    const customer = await getCustomer({ data: { customerId: params.customerId } });
    return { customer };
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

function CustomerDetailPage() {
  const { customer } = Route.useLoaderData();
  const { organization } = Route.useRouteContext();
  const router = useRouter();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const submitUpdate = useServerFn(updateCustomer);
  const submitDelete = useServerFn(deleteCustomer);

  const editForm = useForm({
    defaultValues: {
      name: customer.name,
      email: customer.email,
      company: customer.company ?? "",
    },
    onSubmit: async ({ value }) => {
      await submitUpdate({
        data: {
          customerId: customer.id,
          name: value.name,
          email: value.email,
          company: value.company || undefined,
        },
      });
      setEditOpen(false);
      toast.success("Customer updated");
      router.invalidate();
    },
  });

  const handleDelete = async () => {
    await submitDelete({ data: { customerId: customer.id } });
    toast.success("Customer deleted");
    navigate({ to: "/customers" });
  };

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
      title={customer.name}
      description={customer.email}
      breadcrumbs={[
        { label: "Customers", href: "/customers" },
        { label: customer.name },
      ]}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/portal/${organization?.slug}/${customer.id}`, '_blank')}
            disabled={!organization?.slug}
          >
            <ExternalLink className="h-4 w-4" />
            View Portal
          </Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setDeleteOpen(true)}
            disabled={customer.licenses.length > 0}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-5xl">
        {/* Hero Header */}
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <div className="bg-gradient-to-br from-vibrant/5 via-transparent to-transparent p-6">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-vibrant text-white font-bold text-xl shadow-lg shadow-vibrant/25">
                {getInitials(customer.name)}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1">{customer.name}</h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </span>
                  {customer.company && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      {customer.company}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Customer since {new Date(customer.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/60 p-5 hover:border-vibrant/40 hover:shadow-lg hover:shadow-vibrant/5 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vibrant/10">
                <Mail className="h-5 w-5 text-vibrant" />
              </div>
              <span className="text-sm text-muted-foreground">Email</span>
            </div>
            <p className="font-medium truncate">{customer.email}</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-5 hover:border-vibrant/40 hover:shadow-lg hover:shadow-vibrant/5 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vibrant/10">
                <Building2 className="h-5 w-5 text-vibrant" />
              </div>
              <span className="text-sm text-muted-foreground">Company</span>
            </div>
            <p className="font-medium truncate">{customer.company || "—"}</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-5 hover:border-vibrant/40 hover:shadow-lg hover:shadow-vibrant/5 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vibrant/10">
                <Key className="h-5 w-5 text-vibrant" />
              </div>
              <span className="text-sm text-muted-foreground">Licenses</span>
            </div>
            <p className="text-3xl font-bold">{customer.licenses.length}</p>
          </div>
        </div>

        {/* Licenses */}
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <div className="border-b border-border/40 bg-muted/30 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vibrant/10">
                <Key className="h-5 w-5 text-vibrant" />
              </div>
              <div>
                <h2 className="font-semibold">Licenses</h2>
                <p className="text-sm text-muted-foreground">
                  All licenses assigned to this customer
                </p>
              </div>
            </div>
            <Button variant="vibrant" size="sm" asChild className="shadow-lg shadow-vibrant/25">
              <Link to="/licenses">
                <Plus className="h-4 w-4" />
                Issue License
              </Link>
            </Button>
          </div>

          {customer.licenses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
                <Key className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No licenses yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Issue a license to this customer to get started.
              </p>
              <Button variant="vibrant" asChild className="shadow-lg shadow-vibrant/25">
                <Link to="/licenses">
                  <Plus className="h-4 w-4" />
                  Issue License
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {customer.licenses.map((license) => (
                <Link
                  key={license.id}
                  to="/licenses/$licenseId"
                  params={{ licenseId: license.id }}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted group-hover:bg-vibrant/10 transition-colors">
                      <Key className="h-5 w-5 text-muted-foreground group-hover:text-vibrant transition-colors" />
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="font-mono text-sm font-medium">
                        {license.key}
                      </code>
                      <CopyButton text={license.key} />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Badge variant={getStatusVariant(license.status)}>
                      {license.status}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px]">
                      <Calendar className="h-4 w-4" />
                      {license.expiresAt
                        ? new Date(license.expiresAt).toLocaleDateString()
                        : "Never"}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-vibrant transition-all group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Customer Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant/10 mb-4">
              <Edit2 className="h-6 w-6 text-vibrant" />
            </div>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editForm.handleSubmit();
            }}
          >
            <div className="space-y-4 py-4">
              <editForm.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Name is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Name</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="h-11"
                      ignorePasswordManagers
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </editForm.Field>

              <editForm.Field
                name="email"
                validators={{
                  onChange: ({ value }) =>
                    !value
                      ? "Email is required"
                      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                        ? "Invalid email address"
                        : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Email</Label>
                    <Input
                      id={field.name}
                      type="email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="h-11"
                      ignorePasswordManagers
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </editForm.Field>

              <editForm.Field name="company">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Company <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="h-11"
                      ignorePasswordManagers
                    />
                  </div>
                )}
              </editForm.Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <editForm.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" variant="vibrant" disabled={!canSubmit} className="shadow-lg shadow-vibrant/25">
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </editForm.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this customer and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
