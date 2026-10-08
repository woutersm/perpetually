import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Key } from "lucide-react";
import { toast } from "sonner";
import { PageLayout, EmptyState } from "@/components/page-layout";
import { Status } from "@/components/status";
import { getLicenses } from "@/functions/licenses";
import { formatDate, licenseState, type LicenseState } from "@/lib/format";
import { DataTable, Mono, Tabs } from "@/components/blocks";

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
    <PageLayout title="Licenses" description="License keys issued to your customers when they pay through Stripe.">
      {licenses.length === 0 ? (
        <EmptyState
          icon={<Key className="size-6" />}
          title="No licenses yet"
          description="A license key is created here as soon as a customer completes a Stripe payment for one of your products."
        />
      ) : (
        <>
          <Tabs
            value={filter}
            onChange={setFilter}
            options={FILTERS.map((f) => ({ ...f, count: counts[f.value] ?? 0 }))}
          />
          <DataTable
            rows={visible}
            rowKey={(l) => l.id}
            href={(l) => `/licenses/${l.id}`}
            empty={`No ${filter} licenses.`}
            columns={[
              {
                header: "License key",
                width: "minmax(0,2.2fr)",
                cell: (l) => (
                  <div className="flex items-center gap-1">
                    <Mono className="truncate">{l.key}</Mono>
                    <CopyButton text={l.key} />
                  </div>
                ),
              },
              { header: "Product", width: "minmax(0,1.6fr)", cell: (l) => <div className="truncate">{l.product?.name ?? "—"}</div> },
              {
                header: "Customer",
                width: "minmax(0,1.6fr)",
                cell: (l) => (
                  <>
                    <div className="truncate">{l.customer?.name ?? "—"}</div>
                    <div className="truncate text-xs text-muted-foreground">{l.customer?.email}</div>
                  </>
                ),
              },
              { header: "Status", width: "7rem", cell: (l) => <Status status={l.state} /> },
              {
                header: "Issued",
                width: "7rem",
                cell: (l) => <span className="tabular-nums text-muted-foreground">{formatDate(l.createdAt)}</span>,
              },
              {
                header: "Expires",
                width: "7rem",
                cell: (l) => <span className="tabular-nums text-muted-foreground">{formatDate(l.expiresAt, "Never")}</span>,
              },
            ]}
          />
        </>
      )}
    </PageLayout>
  );
}
