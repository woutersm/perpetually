import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Copy,
  KeyRound,
  RefreshCw,
  Key,
  Shield,
  Check,
  Monitor,
  Trash2,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Status } from "@/components/status";
import {
  getPortalCustomer,
  regenerateLicenseKey,
  removeActivation,
} from "@/functions/portal";
import { toShortDate, formatRelativeTime } from "@/lib/utils";

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
        <Card className="w-full max-w-md rounded-3xl border-border/60">
          <CardHeader className="text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mx-auto mb-4">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Portal Error</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Something went wrong"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  ),
});

function PortalHeader({ orgName, branding }: { orgName: string; branding: Branding }) {
  const accentColor = branding?.accentColor || "#FF6B35";

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          {branding?.logo ? (
            <img
              src={branding.logo}
              alt={orgName}
              className="h-9 object-contain"
              onError={(e) => {
                // Fallback to default logo on error
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
                  boxShadow: `0 10px 15px -3px ${accentColor}40`
                }}
              >
                <span className="text-sm font-bold text-white">
                  {orgName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-lg font-semibold tracking-tight">{orgName}</span>
            </>
          )}
        </div>
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
        <Button variant="outline" size="sm" className="rounded-xl">
          <KeyRound className="h-4 w-4 mr-2" />
          Show key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Your License Key</DialogTitle>
          <DialogDescription>
            Keep this key safe. You'll need it to activate your software.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl bg-muted/50 border border-border/60 p-4">
          <p className="font-mono text-center text-lg tracking-wider select-all">
            {licenseKey}
          </p>
        </div>
        <DialogFooter>
          <Button variant="vibrant" onClick={handleCopy} className="shadow-lg shadow-vibrant/25">
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
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
        <Button variant="outline" size="sm" disabled={status !== "active"} className="rounded-xl">
          <RefreshCw className="h-4 w-4 mr-2" />
          Generate new key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate New Key</DialogTitle>
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
      <div className="text-center py-6 text-muted-foreground text-sm">
        No activations yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activations.map((activation) => (
        <div
          key={activation.id}
          className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </div>
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
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={removingId === activation.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Activation</AlertDialogTitle>
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
    <Card className="rounded-3xl border-border/60 mt-8">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <History className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Activity History</CardTitle>
            <CardDescription>Recent activity on your licenses</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
            >
              <div>
                <p className="text-sm font-medium">{getEventLabel(event.type)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(event.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
        {events.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-4"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show {events.length - 5} more
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerPortal() {
  const data = Route.useLoaderData() as PortalData;
  const { customer, licenses, events, organization } = data;
  const { slug, customerId } = Route.useParams();
  const branding = organization.branding;
  const accentColor = branding?.accentColor || "#FF6B35";

  // CSS custom properties for accent color
  const accentStyles = {
    "--accent-color": accentColor,
    "--accent-color-light": `${accentColor}20`,
    "--accent-color-shadow": `${accentColor}40`,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen flex flex-col bg-background" style={accentStyles}>
      <PortalHeader orgName={organization.name} branding={branding} />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="lg:w-80 border-b lg:border-b-0 lg:border-r border-border/40 bg-muted/20 relative overflow-hidden">
          {/* Gradient orb */}
          <div
            className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[100px] opacity-50"
            style={{ backgroundColor: `${accentColor}20` }}
          />

          <div className="relative p-6 lg:p-8">
            {/* Customer Info */}
            <div className="mb-8">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg mb-4"
                style={{
                  background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
                  boxShadow: `0 10px 15px -3px ${accentColor}40`
                }}
              >
                <span className="text-xl font-bold text-white">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h1 className="text-xl font-semibold">{customer.name}</h1>
              <p className="text-sm text-muted-foreground">{customer.email}</p>
              {customer.company && (
                <p className="text-sm text-muted-foreground mt-1">{customer.company}</p>
              )}
            </div>

            <Separator className="my-6" />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl border border-border/60 bg-card p-4">
                <p className="text-3xl font-bold" style={{ color: accentColor }}>
                  {licenses.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {licenses.length === 1 ? "License" : "Licenses"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card p-4">
                <p className="text-3xl font-bold text-success">
                  {licenses.filter(l => l.status === "active").length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Active</p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Back link */}
            <button
              onClick={() => window.history.back()}
              className="flex items-center text-sm text-muted-foreground transition-colors group"
              style={{ ["--hover-color" as string]: accentColor }}
              onMouseEnter={(e) => e.currentTarget.style.color = accentColor}
              onMouseLeave={(e) => e.currentTarget.style.color = ""}
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Return to {organization.name}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-4xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Your Licenses</h2>
              <p className="mt-1 text-muted-foreground">
                Manage and view your software licenses
              </p>
            </div>

            {licenses.length === 0 ? (
              <Card className="rounded-3xl border-border/60 border-dashed">
                <CardContent className="py-16 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted mx-auto mb-6">
                    <Key className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No licenses yet</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    You don't have any licenses assigned to your account yet.
                    Contact {organization.name} for assistance.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-4">
                {licenses.map((license) => (
                  <li key={license.id}>
                    <Card
                      className="rounded-3xl border-border/60 transition-all hover:shadow-xl overflow-hidden"
                      style={{
                        ["--hover-border" as string]: `${accentColor}60`,
                        ["--hover-shadow" as string]: `${accentColor}10`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = `${accentColor}60`;
                        e.currentTarget.style.boxShadow = `0 25px 50px -12px ${accentColor}10`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "";
                        e.currentTarget.style.boxShadow = "";
                      }}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div
                              className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
                                boxShadow: `0 10px 15px -3px ${accentColor}40`
                              }}
                            >
                              <Key className="h-7 w-7" />
                            </div>
                            <div>
                              <CardTitle className="text-xl">
                                {license.product?.name}
                              </CardTitle>
                              {license.product?.description && (
                                <CardDescription className="mt-1 max-w-md">
                                  {license.product.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          <Status status={license.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-4">
                        <div className="flex items-center gap-8 text-sm mb-6">
                          <div>
                            <span className="text-muted-foreground block text-xs mb-1">Valid until</span>
                            <p className="font-semibold">
                              {toShortDate(license.expiresAt?.toISOString() ?? null) || "Never"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs mb-1">Activations</span>
                            <p className="font-semibold">
                              {license.activationCount}
                              {license.activationLimit && ` / ${license.activationLimit}`}
                              {" devices"}
                            </p>
                          </div>
                        </div>

                        {/* Activations Section */}
                        {license.activations.length > 0 && (
                          <div className="border-t border-border/40 pt-4">
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <Monitor className="h-4 w-4 text-muted-foreground" />
                              Active Devices
                            </h4>
                            <ActivationsList
                              activations={license.activations}
                              licenseId={license.id}
                              slug={slug}
                              customerId={customerId}
                            />
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2 pt-0 pb-6 px-6 border-t border-border/40">
                        <ShowKeyDialog licenseKey={license.key} />
                        <GenerateNewKeyDialog
                          licenseId={license.id}
                          status={license.status}
                          slug={slug}
                          customerId={customerId}
                        />
                      </CardFooter>
                    </Card>
                  </li>
                ))}
              </ul>
            )}

            {/* Activity History */}
            <EventHistory events={events} />
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-4">
          {branding?.supportEmail && (
            <a
              href={`mailto:${branding.supportEmail}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact Support
            </a>
          )}
          {!branding?.hidePoweredBy && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Powered by</span>
              <a
                href="https://perpetually.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-vibrant">
                  <span className="text-[10px] font-bold text-white">P</span>
                </div>
                <span className="text-sm font-semibold">Perpetually</span>
              </a>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
