import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import {
  getLicense,
  updateLicense,
  disableLicense,
  createActivation,
  deleteActivation,
} from "@/functions/licenses";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { Plus, Key, Monitor, Copy, Check, Calendar, User, Package, Trash2, Clock, Edit2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type LicenseStatus = "active" | "disabled";

export const Route = createFileRoute("/_auth/licenses/$licenseId")({
  component: LicenseDetailPage,
  loader: async ({ params }) => {
    const license = await getLicense({ data: { licenseId: params.licenseId } });
    return { license };
  },
});

function LicenseDetailPage() {
  const { license } = Route.useLoaderData();
  const router = useRouter();
  const [activationOpen, setActivationOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [deleteActivationId, setDeleteActivationId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submitActivation = useServerFn(createActivation);
  const submitUpdate = useServerFn(updateLicense);
  const submitDisable = useServerFn(disableLicense);
  const submitDeleteActivation = useServerFn(deleteActivation);

  const activationForm = useForm({
    defaultValues: { name: "", machineId: "" },
    onSubmit: async ({ value }) => {
      await submitActivation({
        data: {
          licenseId: license.id,
          name: value.name || undefined,
          machineId: value.machineId || undefined,
        },
      });
      setActivationOpen(false);
      activationForm.reset();
      toast.success("Activation added");
      router.invalidate();
    },
  });

  const editForm = useForm({
    defaultValues: {
      status: license.status,
      expiresAt: license.expiresAt
        ? new Date(license.expiresAt).toISOString().split("T")[0]
        : "",
      activationLimit: license.activationLimit?.toString() ?? "",
    },
    onSubmit: async ({ value }) => {
      await submitUpdate({
        data: {
          licenseId: license.id,
          status: value.status as "active" | "disabled",
          expiresAt: value.expiresAt || undefined,
          activationLimit: value.activationLimit
            ? parseInt(value.activationLimit)
            : null,
        },
      });
      setEditOpen(false);
      toast.success("License updated");
      router.invalidate();
    },
  });

  const handleDisable = async () => {
    await submitDisable({
      data: {
        licenseId: license.id,
        reason: "customer_request",
      },
    });
    setRevokeOpen(false);
    toast.success("License disabled");
    router.invalidate();
  };

  const handleDeleteActivation = async () => {
    if (!deleteActivationId) return;
    await submitDeleteActivation({ data: { activationId: deleteActivationId } });
    setDeleteActivationId(null);
    toast.success("Activation removed");
    router.invalidate();
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(license.key);
    setCopied(true);
    toast.success("License key copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "outline-success";
      case "disabled":
        return "outline-destructive";
      default:
        return "secondary";
    }
  };

  return (
    <PageLayout
      title="License Details"
      breadcrumbs={[
        { label: "Licenses", href: "/licenses" },
        { label: license.key.substring(0, 12) + "..." },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
          {license.status !== "disabled" && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setRevokeOpen(true)}
            >
              Disable
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6 max-w-5xl">
        {/* Hero Header */}
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <div className="bg-gradient-to-br from-vibrant/5 via-transparent to-transparent p-6">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-vibrant text-white shadow-lg shadow-vibrant/25">
                <Key className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <code className="text-xl font-mono font-bold">{license.key}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Badge variant={getStatusVariant(license.status)}>
                    {license.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Created {new Date(license.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/products/$productId"
            params={{ productId: license.product?.id || "" }}
            className="rounded-2xl border border-border/60 p-5 hover:border-vibrant/40 hover:shadow-lg hover:shadow-vibrant/5 transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vibrant/10 group-hover:bg-vibrant/20 transition-colors">
                <Package className="h-5 w-5 text-vibrant" />
              </div>
              <span className="text-sm text-muted-foreground">Product</span>
            </div>
            <p className="font-medium truncate group-hover:text-vibrant transition-colors">
              {license.product?.name || "—"}
            </p>
          </Link>

          <Link
            to="/customers/$customerId"
            params={{ customerId: license.customer?.id || "" }}
            className="rounded-2xl border border-border/60 p-5 hover:border-vibrant/40 hover:shadow-lg hover:shadow-vibrant/5 transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vibrant/10 group-hover:bg-vibrant/20 transition-colors">
                <User className="h-5 w-5 text-vibrant" />
              </div>
              <span className="text-sm text-muted-foreground">Customer</span>
            </div>
            <p className="font-medium truncate group-hover:text-vibrant transition-colors">
              {license.customer?.name || "—"}
            </p>
            {license.customer?.email && (
              <p className="text-sm text-muted-foreground truncate">
                {license.customer.email}
              </p>
            )}
          </Link>

          <div className="rounded-2xl border border-border/60 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vibrant/10">
                <Calendar className="h-5 w-5 text-vibrant" />
              </div>
              <span className="text-sm text-muted-foreground">Expires</span>
            </div>
            <p className="font-medium">
              {license.expiresAt
                ? new Date(license.expiresAt).toLocaleDateString()
                : "Never"}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vibrant/10">
                <Monitor className="h-5 w-5 text-vibrant" />
              </div>
              <span className="text-sm text-muted-foreground">Activations</span>
            </div>
            <p className="font-medium">
              {license.activations.length}
              {license.activationLimit !== null && (
                <span className="text-muted-foreground font-normal">
                  {" "}/ {license.activationLimit}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Activations */}
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <div className="border-b border-border/40 bg-muted/30 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vibrant/10">
                <Monitor className="h-5 w-5 text-vibrant" />
              </div>
              <div>
                <h2 className="font-semibold">Activations</h2>
                <p className="text-sm text-muted-foreground">
                  Devices and machines using this license
                </p>
              </div>
            </div>
            <Button
              variant="vibrant"
              size="sm"
              onClick={() => setActivationOpen(true)}
              disabled={
                license.activationLimit !== null &&
                license.activations.length >= license.activationLimit
              }
              className="shadow-lg shadow-vibrant/25"
            >
              <Plus className="h-4 w-4" />
              Add Activation
            </Button>
          </div>

          {license.activations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
                <Monitor className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No activations yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                This license hasn't been activated on any devices.
              </p>
              <Button
                variant="vibrant"
                onClick={() => setActivationOpen(true)}
                disabled={
                  license.activationLimit !== null &&
                  license.activations.length >= license.activationLimit
                }
                className="shadow-lg shadow-vibrant/25"
              >
                <Plus className="h-4 w-4" />
                Add Activation
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {license.activations.map((activation) => (
                <div
                  key={activation.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <Monitor className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{activation.name || "Unnamed device"}</p>
                      {activation.machineId && (
                        <p className="font-mono text-sm text-muted-foreground">
                          {activation.machineId}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(activation.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
                      <Clock className="h-4 w-4" />
                      {activation.lastSeenAt
                        ? `Seen ${new Date(activation.lastSeenAt).toLocaleDateString()}`
                        : "Never seen"}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteActivationId(activation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Activation Dialog */}
      <Dialog open={activationOpen} onOpenChange={setActivationOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant/10 mb-4">
              <Monitor className="h-6 w-6 text-vibrant" />
            </div>
            <DialogTitle>Add Activation</DialogTitle>
            <DialogDescription>
              Manually activate this license on a device.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              activationForm.handleSubmit();
            }}
          >
            <div className="space-y-4 py-4">
              <activationForm.Field name="name">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Device Name <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Work Laptop"
                      className="h-11"
                      ignorePasswordManagers
                    />
                  </div>
                )}
              </activationForm.Field>

              <activationForm.Field name="machineId">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Machine ID <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Hardware identifier"
                      className="h-11 font-mono"
                      ignorePasswordManagers
                    />
                    <p className="text-xs text-muted-foreground">
                      A unique identifier for the device hardware
                    </p>
                  </div>
                )}
              </activationForm.Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActivationOpen(false)}
              >
                Cancel
              </Button>
              <activationForm.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" variant="vibrant" disabled={!canSubmit} className="shadow-lg shadow-vibrant/25">
                    {isSubmitting ? "Adding..." : "Add Activation"}
                  </Button>
                )}
              </activationForm.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit License Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant/10 mb-4">
              <Edit2 className="h-6 w-6 text-vibrant" />
            </div>
            <DialogTitle>Edit License</DialogTitle>
            <DialogDescription>
              Update license status and limits.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editForm.handleSubmit();
            }}
          >
            <div className="space-y-4 py-4">
              <editForm.Field name="status">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value as LicenseStatus)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </editForm.Field>

              <editForm.Field name="expiresAt">
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
                    <p className="text-xs text-muted-foreground">
                      Leave empty for no expiration
                    </p>
                  </div>
                )}
              </editForm.Field>

              <editForm.Field name="activationLimit">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Activation Limit</Label>
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

      {/* Disable Confirmation */}
      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle>Disable License?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disable this license. The customer will no longer be
              able to use it. You can re-enable it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disable License
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Activation Confirmation */}
      <AlertDialog
        open={!!deleteActivationId}
        onOpenChange={(open: boolean) => !open && setDeleteActivationId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Activation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate this device. The customer can reactivate if
              they have available activation slots.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteActivation}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
