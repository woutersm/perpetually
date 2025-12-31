import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Copy, KeyRound, RefreshCw, Key, Shield, Check } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Status } from "@/components/status";
import { getPortalCustomer, regenerateLicenseKey } from "@/functions/portal";
import { toShortDate } from "@/lib/utils";

export const Route = createFileRoute("/portal/$slug/$customerId")({
  component: CustomerPortal,
  loader: async ({ params }) => {
    const data = await getPortalCustomer({
      data: { slug: params.slug, customerId: params.customerId },
    });
    return data;
  },
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex flex-col bg-background">
      <PortalHeader orgName="Perpetually" />
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

function PortalHeader({ orgName }: { orgName: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-vibrant shadow-lg shadow-vibrant/25">
            <span className="text-sm font-bold text-white">P</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Perpetually</span>
          <span className="text-muted-foreground/50 mx-1">/</span>
          <span className="text-muted-foreground font-medium">{orgName}</span>
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

function CustomerPortal() {
  const { customer, licenses, organization } = Route.useLoaderData();
  const { slug, customerId } = Route.useParams();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PortalHeader orgName={organization.name} />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="lg:w-80 border-b lg:border-b-0 lg:border-r border-border/40 bg-muted/20 relative overflow-hidden">
          {/* Gradient orb */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-vibrant/10 rounded-full blur-[100px] opacity-50" />

          <div className="relative p-6 lg:p-8">
            {/* Customer Info */}
            <div className="mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-vibrant shadow-lg shadow-vibrant/25 mb-4">
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
                <p className="text-3xl font-bold text-vibrant">{licenses.length}</p>
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
              className="flex items-center text-sm text-muted-foreground hover:text-vibrant transition-colors group"
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
                    <Card className="rounded-3xl border-border/60 transition-all hover:border-vibrant/40 hover:shadow-xl hover:shadow-vibrant/5 overflow-hidden">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-vibrant text-white shadow-lg shadow-vibrant/25 shrink-0">
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
                        <div className="flex items-center gap-8 text-sm">
                          <div>
                            <span className="text-muted-foreground block text-xs mb-1">Valid until</span>
                            <p className="font-semibold">
                              {toShortDate(license.expiresAt?.toISOString() ?? null) || "Never"}
                            </p>
                          </div>
                          {license.activationLimit && (
                            <div>
                              <span className="text-muted-foreground block text-xs mb-1">Activations</span>
                              <p className="font-semibold">
                                {license.activationLimit} devices
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2 pt-0 pb-6 px-6">
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
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Powered by</span>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-vibrant">
              <span className="text-[10px] font-bold text-white">P</span>
            </div>
            <span className="text-sm font-semibold">Perpetually</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
