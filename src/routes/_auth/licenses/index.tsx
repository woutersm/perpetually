import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy, Key } from "lucide-react";
import { toast } from "sonner";
import { PageLayout, EmptyState } from "@/components/page-layout";
import { Status } from "@/components/status";
import { getLicenses } from "@/functions/licenses";
import { formatDate, licenseState, type LicenseState } from "@/lib/format";
import { cn } from "@/lib/utils";

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
      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
      title="Copy license key"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

const FILTERS: { value: LicenseState | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "disabled", label: "Disabled" },
];

const COLUMNS = "grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1.6fr)_7rem_7rem_7rem] gap-6";

function LicensesPage() {
  const { licenses } = Route.useLoaderData();
  const [filter, setFilter] = useState<LicenseState | "all">("all");

  const rows = useMemo(
    () => licenses.map((l) => ({ ...l, state: licenseState(l.status, l.expiresAt) })),
    [licenses]
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.state] = (c[r.state] ?? 0) + 1;
    return c;
  }, [rows]);
  const visible = filter === "all" ? rows : rows.filter((r) => r.state === filter);

  return (
    <PageLayout
      title="Licenses"
      description="License keys issued to your customers when they pay through Stripe."
      breadcrumbs={[{ label: "Licenses" }]}
    >
      {licenses.length === 0 ? (
        <EmptyState
          icon={<Key className="size-6" />}
          title="No licenses yet"
          description="A license key is created here as soon as a customer completes a Stripe payment for one of your products."
        />
      ) : (
        <>
          <div className="mb-6 flex gap-6 border-b border-border">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "-mb-px border-b pb-3 text-sm transition-colors",
                  filter === f.value
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
                <span className="ml-1.5 tabular-nums text-muted-foreground">{counts[f.value] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className={cn(COLUMNS, "label-caps px-3 pb-3")}>
            <div>License key</div>
            <div>Product</div>
            <div>Customer</div>
            <div>Status</div>
            <div>Issued</div>
            <div>Expires</div>
          </div>

          <div className="border-t border-border">
            {visible.map((license) => (
              <Link
                key={license.id}
                to="/licenses/$licenseId"
                params={{ licenseId: license.id }}
                className={cn(
                  COLUMNS,
                  "group items-center border-b border-border px-3 py-3.5 text-sm transition-colors hover:bg-muted/60"
                )}
              >
                <div className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono text-[13px]">{license.key}</span>
                  <CopyButton text={license.key} />
                </div>
                <div className="truncate">{license.product?.name ?? "—"}</div>
                <div className="min-w-0">
                  <div className="truncate">{license.customer?.name ?? "—"}</div>
                  {license.customer?.email && (
                    <div className="truncate text-xs text-muted-foreground">{license.customer.email}</div>
                  )}
                </div>
                <div>
                  <Status status={license.state} />
                </div>
                <div className="tabular-nums text-muted-foreground">{formatDate(license.createdAt)}</div>
                <div className="tabular-nums text-muted-foreground">
                  {formatDate(license.expiresAt, "Never")}
                </div>
              </Link>
            ))}
            {visible.length === 0 && (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">No {filter} licenses.</p>
            )}
          </div>
        </>
      )}
    </PageLayout>
  );
}
