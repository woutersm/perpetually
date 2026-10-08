import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Copy,
  KeyRound,
  RefreshCw,
  Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Status } from "@/components/status";
import {
  getPortalCustomer,
  regenerateLicenseKey,
  removeActivation,
} from "@/functions/portal";
import { formatRelativeTime } from "@/lib/utils";
import { formatDate, licenseState } from "@/lib/format";

// Branding type
type Branding = {
  logo: string | null;
  accentColor: string | null;
  supportEmail: string | null;
  hidePoweredBy: boolean;
} | null;

// Type for portal data
type PortalData = {
  customer: {
    id: string;
    name: string;
    email: string;
    company: string | null;
  };
  licenses: Array<{
    id: string;
    key: string;
    status: "active" | "disabled";
    expiresAt: Date | null;
    activationLimit: number | null;
    createdAt: Date;
    activationCount: number;
    product: {
      id: string;
      name: string;
      description: string | null;
    } | null;
    activations: Array<{
      id: string;
      name: string | null;
      machineId: string | null;
      ipAddress: string | null;
      createdAt: Date;
      lastSeenAt: Date | null;
    }>;
  }>;
  events: Array<{
    id: string;
    type: string;
    createdAt: Date;
    data: Record<string, unknown> | null;
    licenseId: string;
  }>;
  organization: {
    name: string;
    slug: string;
    branding: Branding;
  };
};

export const Route = createFileRoute("/portal/$slug/$customerId")({
  component: CustomerPortal,
  // @ts-expect-error - Drizzle json mode type inference conflict with TanStack Start
  loader: async ({ params }) => {
    const data = await getPortalCustomer({
      data: { slug: params.slug, customerId: params.customerId },
    });
    return data;
  },
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex flex-col bg-background">
      <PortalHeader orgName="Perpetually" branding={null} />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md rounded-md border-border/60">
          <CardHeader className="text-center">
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Something went wrong"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  ),
});

function PortalHeader({ orgName, branding }: { orgName: string; branding: Branding }) {
  const accentColor = branding?.accentColor || "hsl(var(--vibrant))";

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-[880px] items-center justify-between px-6">
        {branding?.logo ? (
          <img
            src={branding.logo}
            alt={orgName}
            className="h-7 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="flex items-center gap-2 text-[15px] font-medium">
            <span className="size-2 rounded-full" style={{ backgroundColor: accentColor }} aria-hidden />
            {orgName}
          </span>
        )}
        <span className="text-sm text-muted-foreground">License portal</span>
      </div>
    </header>
  );
}

function ShowKeyDialog({ licenseKey }: { licenseKey: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    toast.success("License key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-md">
          <KeyRound className="h-4 w-4 mr-2" />
          Show key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Your license key</DialogTitle>
          <DialogDescription>
            Keep this key safe. You'll need it to activate your software.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-muted/50 border border-border p-4">
          <p className="font-mono text-center text-lg tracking-wider select-all">
            {licenseKey}
          </p>
        </div>
        <DialogFooter>
          <Button variant="vibrant" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy key
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GenerateNewKeyDialog({
  licenseId,
  status,
  slug,
  customerId,
}: {
  licenseId: string;
  status: string;
  slug: string;
  customerId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const regenerate = useServerFn(regenerateLicenseKey);

  const handleRegenerate = async () => {
    setIsLoading(true);
    try {
      await regenerate({ data: { slug, customerId, licenseId } });
      toast.success("New license key generated");
      setOpen(false);
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate new key"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={status !== "active"} className="rounded-md">
          <RefreshCw className="h-4 w-4 mr-2" />
          Generate new key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate a new key</DialogTitle>
          <DialogDescription>
            This will invalidate your current key and generate a new one. Any
            existing activations will need to use the new key. Are you sure?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRegenerate}
            disabled={isLoading}
          >
            {isLoading ? "Generating..." : "Yes, generate new key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Activation list with remove functionality
function ActivationsList({
  activations,
  licenseId,
  slug,
  customerId,
}: {
  activations: Array<{
    id: string;
    name: string | null;
    machineId: string | null;
    ipAddress: string | null;
    createdAt: Date;
    lastSeenAt: Date | null;
  }>;
  licenseId: string;
  slug: string;
  customerId: string;
}) {
  const router = useRouter();
  const remove = useServerFn(removeActivation);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (activationId: string) => {
    setRemovingId(activationId);
    try {
      await remove({ data: { slug, customerId, licenseId, activationId } });
      toast.success("Activation removed");
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove activation"
      );
    } finally {
      setRemovingId(null);
    }
  };

  if (activations.length === 0) {
    return (
      <p className="border-b border-border py-3 text-sm text-muted-foreground">Not activated on any device yet.</p>
    );
  }

  return (
    <div className="border-t border-border">
      {activations.map((activation) => (
        <div
          key={activation.id}
          className="flex items-center justify-between border-b border-border py-3"
        >
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium">
                {activation.name || activation.machineId?.substring(0, 12) || "Unknown device"}
              </p>
              <p className="text-xs text-muted-foreground">
                Activated {formatRelativeTime(activation.createdAt)}
                {activation.lastSeenAt && (
                  <> · Last seen {formatRelativeTime(activation.lastSeenAt)}</>
                )}
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                disabled={removingId === activation.id}
              >
                Remove
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this device?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will deactivate this device. The device will need to
                  re-activate using your license key to continue using the software.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleRemove(activation.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
}

// Event type to human-readable label
function getEventLabel(type: string): string {
  switch (type) {
    case "license.created":
      return "License created";
    case "license.key_regenerated":
      return "License key regenerated";
    case "activation.created":
      return "Device activated";
    case "activation.removed":
      return "Device removed";
    default:
      return type;
  }
}

// Event history section
function EventHistory({
  events,
}: {
  events: Array<{
    id: string;
    type: string;
    createdAt: Date;
    data: Record<string, unknown> | null;
    licenseId: string;
  }>;
}) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) {
    return null;
  }

  const displayEvents = expanded ? events : events.slice(0, 5);

  return (
    <section className="mt-16">
      <h2 className="label-caps mb-4">Activity</h2>
      <ol className="border-t border-border">
        {displayEvents.map((event) => (
          <li key={event.id} className="flex justify-between gap-4 border-b border-border py-3 text-sm">
            <span>{getEventLabel(event.type)}</span>
            <span className="text-muted-foreground">{formatRelativeTime(event.createdAt)}</span>
          </li>
        ))}
      </ol>
      {events.length > 5 && (
        <button className="mt-3 text-sm text-muted-foreground hover:text-foreground" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : `Show ${events.length - 5} more`}
        </button>
      )}
    </section>
  );
}

function CustomerPortal() {
  const data = Route.useLoaderData() as PortalData;
  const { customer, licenses, events, organization } = data;
  const { slug, customerId } = Route.useParams();
  const branding = organization.branding;
  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader orgName={organization.name} branding={branding} />

      <main className="mx-auto w-full max-w-[880px] flex-1 px-6 pb-24 pt-12">
        <header className="mb-12">
          <h1 className="text-[28px] leading-tight">Your licenses</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {customer.name} · {customer.email}
            {customer.company && ` · ${customer.company}`}
          </p>
        </header>

        {licenses.length === 0 ? (
          <p className="border-y border-border py-10 text-center text-sm text-muted-foreground">
            No licenses on this account yet. Contact {organization.name} if that looks wrong.
          </p>
        ) : (
          <div className="space-y-16">
            {licenses.map((license) => (
              <section key={license.id}>
                <div className="mb-4 flex items-start justify-between gap-6">
                  <div>
                    <h2 className="text-xl">{license.product?.name}</h2>
                    {license.product?.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{license.product.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <ShowKeyDialog licenseKey={license.key} />
                    <GenerateNewKeyDialog
                      licenseId={license.id}
                      status={license.status}
                      slug={slug}
                      customerId={customerId}
                    />
                  </div>
                </div>

                <dl className="grid grid-cols-[10rem_minmax(0,1fr)] border-t border-border text-sm">
                  <dt className="border-b border-border py-3 text-muted-foreground">Status</dt>
                  <dd className="border-b border-border py-3">
                    <Status status={licenseState(license.status, license.expiresAt)} />
                  </dd>
                  <dt className="border-b border-border py-3 text-muted-foreground">Valid until</dt>
                  <dd className="border-b border-border py-3">{formatDate(license.expiresAt, "Forever")}</dd>
                  <dt className="border-b border-border py-3 text-muted-foreground">Devices</dt>
                  <dd className="border-b border-border py-3">
                    {license.activationCount} of {license.activationLimit ?? "unlimited"}
                  </dd>
                </dl>

                <h3 className="label-caps mb-2 mt-8">Devices</h3>
                <ActivationsList
                  activations={license.activations}
                  licenseId={license.id}
                  slug={slug}
                  customerId={customerId}
                />
              </section>
            ))}
          </div>
        )}

        <EventHistory events={events} />
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto flex max-w-[880px] items-center justify-between px-6 text-sm text-muted-foreground">
          {branding?.supportEmail ? (
            <a href={`mailto:${branding.supportEmail}`} className="hover:text-foreground">
              Contact support
            </a>
          ) : (
            <span />
          )}
          {!branding?.hidePoweredBy && (
            <a href="/" className="hover:text-foreground">
              Powered by perpetually
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
