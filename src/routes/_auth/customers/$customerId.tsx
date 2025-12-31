import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import { getCustomer } from "@/functions/customers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Key, Building2, Mail, Calendar, ChevronRight, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/customers/$customerId")({
  component: CustomerDetailPage,
  loader: async ({ params }) => {
    const customer = await getCustomer({ data: { customerId: params.customerId } });
    return { customer };
  },
});

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
    if (status === "active" && expiresAt && new Date(expiresAt) < new Date()) {
      return "expired";
    }
    return status;
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
        <Button
          variant="outline"
          onClick={() => window.open(`/portal/${organization?.slug}/${customer.id}`, '_blank')}
          disabled={!organization?.slug}
        >
          <ExternalLink className="h-4 w-4" />
          View Portal
        </Button>
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
          <div className="border-b border-border/40 bg-muted/30 px-6 py-5 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vibrant/10">
              <Key className="h-5 w-5 text-vibrant" />
            </div>
            <div>
              <h2 className="font-semibold">Licenses</h2>
              <p className="text-sm text-muted-foreground">
                Licenses assigned to this customer from Stripe purchases
              </p>
            </div>
          </div>

          {customer.licenses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
                <Key className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No licenses yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Licenses will appear here when this customer makes a purchase through Stripe.
              </p>
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
                    <Badge variant={getStatusVariant(license.status, license.expiresAt)}>
                      {getStatusLabel(license.status, license.expiresAt)}
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
    </PageLayout>
  );
}
