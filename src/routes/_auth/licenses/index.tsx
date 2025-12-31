import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, EmptyState } from "@/components/page-layout";
import { getLicenses } from "@/functions/licenses";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Key,
  Copy,
  Check,
  Calendar,
  User,
  Package,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/licenses/")({
  component: LicensesPage,
  loader: async ({ context }) => {
    const licenses = await getLicenses({ data: { isTestMode: context.isTestMode } });
    return { licenses };
  },
});

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
  const { licenses } = Route.useLoaderData();

  const getStatusVariant = (status: string, expiresAt: Date | null) => {
    // Check if expired by date
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return "outline-warning";
    }
    switch (status) {
      case "active":
        return "outline-success";
      case "disabled":
        return "outline-destructive";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string, expiresAt: Date | null) => {
    // Check if expired by date
    if (status === "active" && expiresAt && new Date(expiresAt) < new Date()) {
      return "expired";
    }
    return status;
  };

  return (
    <PageLayout
      title="Licenses"
      description="License keys issued to your customers via Stripe payments."
      breadcrumbs={[{ label: "Licenses" }]}
    >
      {licenses.length === 0 ? (
        <EmptyState
          icon={<Key className="h-8 w-8" />}
          title="No licenses yet"
          description="Licenses are automatically created when customers purchase your products through Stripe. Once a payment is completed, a license key will be generated and appear here."
          action={
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Waiting for Stripe payments...
            </div>
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
                  <Badge variant={getStatusVariant(license.status, license.expiresAt)}>
                    {getStatusLabel(license.status, license.expiresAt)}
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
    </PageLayout>
  );
}
