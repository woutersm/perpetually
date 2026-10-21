import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import { DataTable, DefinitionList, Mono, Section } from "@/components/blocks";
import { Status } from "@/components/status";
import { formatDate } from "@/lib/format";
import { format } from "date-fns";
import {
  getLicense,
  getLicenseEvents,
  updateLicense,
  disableLicense,
  enableLicense,
  createActivation,
  deleteActivation,
} from "@/functions/licenses";
import { Button } from "@/components/ui/button";
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
import { Copy, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/licenses/$licenseId")({
  component: LicenseDetailPage,
  // @ts-expect-error - Drizzle json mode type inference conflict with TanStack Start
  loader: async ({ params }) => {
    const [license, events] = await Promise.all([
      getLicense({ data: { licenseId: params.licenseId } }),
      getLicenseEvents({ data: { licenseId: params.licenseId } }),
    ]);
    return { license, events };
  },
});

type LicenseEventData = {
  id: string;
  type: EventType;
  actorType: string;
  actorId: string | null;
  data: Record<string, unknown> | null;
  createdAt: Date;
  licenseId: string;
  organizationId: string;
  ipAddress: string | null;
  userAgent: string | null;
};

type ActivationData = {
  id: string;
  name: string | null;
  machineId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date | null;
  licenseId: string;
  organizationId: string;
};

type DisabledReason = "refund" | "chargeback" | "fraud" | "customer_request" | "other";

const DISABLED_REASON_LABELS: Record<DisabledReason, string> = {
  refund: "Refund",
  chargeback: "Chargeback",
  fraud: "Fraud",
  customer_request: "Customer request",
  other: "Other",
};

type EventType =
  | "license.created"
  | "license.status_changed"
  | "license.extended"
  | "license.key_regenerated"
  | "activation.created"
  | "activation.removed";

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  "license.created": "License created",
  "license.status_changed": "Status changed",
  "license.extended": "Expiry extended",
  "license.key_regenerated": "Key regenerated",
  "activation.created": "Device added",
  "activation.removed": "Device removed",
};

const ACTOR_TYPE_LABELS: Record<string, string> = {
  user: "User",
  api: "API",
  system: "System",
  customer: "Customer",
};

type LoaderData = {
  license: Awaited<ReturnType<typeof getLicense>>;
  events: LicenseEventData[];
};

function LicenseDetailPage() {
  const { license, events } = Route.useLoaderData() as LoaderData;
  const router = useRouter();
  const [activationOpen, setActivationOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [deleteActivationId, setDeleteActivationId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submitActivation = useServerFn(createActivation);
  const submitUpdate = useServerFn(updateLicense);
  const submitDisable = useServerFn(disableLicense);
  const submitEnable = useServerFn(enableLicense);
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
      expiresAt: license.expiresAt
        ? new Date(license.expiresAt).toISOString().split("T")[0]
        : "",
      activationLimit: license.activationLimit?.toString() ?? "",
    },
    onSubmit: async ({ value }) => {
      await submitUpdate({
        data: {
          licenseId: license.id,
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

  const disableForm = useForm({
    defaultValues: {
      reason: "customer_request" as DisabledReason,
      notes: "",
    },
    onSubmit: async ({ value }) => {
      await submitDisable({
        data: {
          licenseId: license.id,
          reason: value.reason,
          notes: value.notes || undefined,
        },
      });
      setDisableOpen(false);
      disableForm.reset();
      toast.success("License disabled");
      router.invalidate();
    },
  });

  const handleEnable = async () => {
    await submitEnable({
      data: { licenseId: license.id },
    });
    toast.success("License enabled");
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

  // Compute if license is expired (active but past expiration date)
  const isExpired =
    license.status === "active" &&
    license.expiresAt &&
    new Date(license.expiresAt) < new Date();

  const displayStatus = isExpired ? "expired" : license.status;
  const atLimit = license.activationLimit !== null && license.activations.length >= license.activationLimit;
  const data = (event: LicenseEventData) => (event.data ?? {}) as Record<string, unknown>;

  const describeEvent = (event: LicenseEventData) => {
    const d = data(event);
    switch (event.type) {
      case "license.status_changed":
        return `${d.previousStatus} to ${d.newStatus}${
          d.reason ? `, ${DISABLED_REASON_LABELS[d.reason as DisabledReason] ?? String(d.reason)}` : ""
        }`;
      case "license.extended":
        return `Now expires ${formatDate(d.newExpiresAt as string | null, "never")}`;
      case "activation.created":
      case "activation.removed":
        return String(d.name ?? "Unnamed device");
      case "license.created":
        return d.simulated ? "Simulated Stripe payment" : `Stripe payment${d.isTest ? " (test mode)" : ""}`;
      default:
        return null;
    }
  };

  return (
    <PageLayout
      title={license.key}
      breadcrumbs={[{ label: "Licenses", href: "/licenses" }, { label: license.key }]}
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={copyToClipboard}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            Copy key
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          {license.status === "disabled" ? (
            <Button variant="outline" size="sm" onClick={handleEnable}>
              Enable
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDisableOpen(true)}>
              Disable
            </Button>
          )}
        </>
      }
    >
      {isExpired && (
        <p className="mb-10 border-l-2 border-warning pl-4 text-sm">
          Expired on {formatDate(license.expiresAt)}. The customer can't use it until you extend the expiry date.
        </p>
      )}
      {license.status === "disabled" && (
        <div className="mb-10 border-l-2 border-destructive pl-4 text-sm">
          <p>
            Disabled{license.disabledAt && ` on ${formatDate(license.disabledAt)}`}
            {license.disabledReason && ` for ${DISABLED_REASON_LABELS[license.disabledReason as DisabledReason].toLowerCase()}`}.
          </p>
          {license.disabledNotes && <p className="mt-1 text-muted-foreground">{license.disabledNotes}</p>}
        </div>
      )}

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="License" className="mt-0">
          <DefinitionList
            items={[
              { label: "Status", value: <Status status={displayStatus} /> },
              { label: "Issued", value: formatDate(license.createdAt) },
              { label: "Expires", value: formatDate(license.expiresAt, "Never") },
              {
                label: "Devices",
                value: `${license.activations.length} of ${license.activationLimit ?? "unlimited"}`,
              },
            ]}
          />
        </Section>
        <Section title="Bought" className="mt-0">
          <DefinitionList
            items={[
              {
                label: "Product",
                value: license.product ? (
                  <Link to="/products/$productId" params={{ productId: license.product.id }} className="hover:text-vibrant">
                    {license.product.name}
                  </Link>
                ) : (
                  "—"
                ),
              },
              {
                label: "Customer",
                value: license.customer ? (
                  <Link to="/customers/$customerId" params={{ customerId: license.customer.id }} className="hover:text-vibrant">
                    {license.customer.name}
                    <span className="block text-xs text-muted-foreground">{license.customer.email}</span>
                  </Link>
                ) : (
                  "—"
                ),
              },
              { label: "Payment", value: <Mono>{license.stripePaymentIntentId ?? "—"}</Mono> },
            ]}
          />
        </Section>
      </div>

      <Section
        title="Devices"
        description={atLimit ? "Activation limit reached." : undefined}
        actions={
          <Button variant="outline" size="sm" onClick={() => setActivationOpen(true)} disabled={atLimit}>
            Add device
          </Button>
        }
      >
        <DataTable
          rows={license.activations as ActivationData[]}
          rowKey={(a) => a.id}
          empty="Not activated on any device yet."
          columns={[
            {
              header: "Device",
              width: "minmax(0,2fr)",
              cell: (a) => (
                <>
                  <div className="truncate">{a.name || "Unnamed device"}</div>
                  {a.machineId && <Mono className="text-xs text-muted-foreground">{a.machineId}</Mono>}
                </>
              ),
            },
            { header: "Activated", width: "8rem", cell: (a) => <span className="tabular-nums text-muted-foreground">{formatDate(a.createdAt)}</span> },
            { header: "Last seen", width: "8rem", cell: (a) => <span className="tabular-nums text-muted-foreground">{formatDate(a.lastSeenAt, "Never")}</span> },
            {
              header: "",
              width: "5rem",
              className: "text-right",
              cell: (a) => (
                <button
                  onClick={() => setDeleteActivationId(a.id)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              ),
            },
          ]}
        />
      </Section>

      <Section title="History">
        {events.length === 0 ? (
          <p className="border-t border-border py-4 text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <ol className="border-t border-border">
            {(events as LicenseEventData[]).map((event) => (
              <li
                key={event.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b border-border py-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)_6rem] sm:gap-6"
              >
                <span className="tabular-nums text-muted-foreground">
                  {format(new Date(event.createdAt), "d MMM yyyy, HH:mm")}
                </span>
                <span className="min-w-0 max-sm:order-last max-sm:col-span-2">
                  {EVENT_TYPE_LABELS[event.type] ?? event.type}
                  {describeEvent(event) && <span className="text-muted-foreground"> · {describeEvent(event)}</span>}
                </span>
                <span className="text-right text-muted-foreground">{ACTOR_TYPE_LABELS[event.actorType] ?? event.actorType}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* Add Activation Dialog */}
      <Dialog open={activationOpen} onOpenChange={setActivationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add device</DialogTitle>
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
                  <Button type="submit" variant="vibrant" disabled={!canSubmit}>
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
            <DialogTitle>Edit license</DialogTitle>
            <DialogDescription>
              Update license expiration and activation limits.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editForm.handleSubmit();
            }}
          >
            <div className="space-y-4 py-4">
              <editForm.Field name="expiresAt">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Expiry date</Label>
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
                    <Label htmlFor={field.name}>Device limit</Label>
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
                  <Button type="submit" variant="vibrant" disabled={!canSubmit}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </editForm.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disable License Dialog */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable license</DialogTitle>
            <DialogDescription>
              This will disable this license. The customer will no longer be
              able to use it. You can re-enable it later if needed.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              disableForm.handleSubmit();
            }}
          >
            <div className="space-y-4 py-4">
              <disableForm.Field name="reason">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value as DisabledReason)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="refund">Refund</SelectItem>
                        <SelectItem value="chargeback">Chargeback</SelectItem>
                        <SelectItem value="fraud">Fraud</SelectItem>
                        <SelectItem value="customer_request">Customer request</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </disableForm.Field>

              <disableForm.Field name="notes">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Notes <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Additional details about why this license is being disabled..."
                      className="min-h-[80px]"
                    />
                  </div>
                )}
              </disableForm.Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisableOpen(false)}
              >
                Cancel
              </Button>
              <disableForm.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={!canSubmit}
                  >
                    {isSubmitting ? "Disabling..." : "Disable License"}
                  </Button>
                )}
              </disableForm.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
