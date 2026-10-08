import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { PageLayout } from "@/components/page-layout";
import { DataTable, Mono, Section, StatRow } from "@/components/blocks";
import { Status } from "@/components/status";
import { getDashboardStats } from "@/functions/dashboard";
import { formatDate, licenseState } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
  loader: async ({ context }) => {
    const stats = await getDashboardStats({ data: { isTestMode: context.isTestMode } });
    return { stats };
  },
});

type Stats = Awaited<ReturnType<typeof getDashboardStats>>;

/** Single-series bar chart: licenses issued per week, with a hover tooltip per bar */
function WeeklyChart({ weeks }: { weeks: Stats["weekly"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const total = weeks.reduce((sum, w) => sum + w.count, 0);
  const active = hover === null ? null : weeks[hover];

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">
          {active
            ? `Week of ${format(new Date(active.weekStart), "d MMM")}`
            : "Last 26 weeks"}
        </span>
        <span className="tabular-nums">
          {active ? `${active.count} issued` : `${total} issued`}
        </span>
      </div>

      <div
        className="relative h-40 border-b border-border"
        role="img"
        aria-label={`Licenses issued per week over the last 26 weeks, ${total} in total, peak ${max} in one week`}
      >
        {/* Gridline at the peak value */}
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <span className="absolute -top-5 left-0 text-[11px] tabular-nums text-muted-foreground">{max}</span>

        <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
          {weeks.map((w, i) => (
            <div
              key={w.weekStart}
              className="flex h-full flex-1 items-end"
              onMouseEnter={() => setHover(i)}
            >
              <div
                className={cn(
                  "w-full rounded-t-[4px] transition-colors",
                  hover === i ? "bg-vibrant" : "bg-foreground/80"
                )}
                style={{ height: `${(w.count / max) * 100}%`, minHeight: w.count ? 2 : 0 }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        {[0, 9, 18, weeks.length - 1].map((i) => (
          <span key={i}>{weeks[i] && format(new Date(weeks[i].weekStart), "d MMM")}</span>
        ))}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { stats } = Route.useLoaderData();
  const trend = stats.licenseTrend;

  return (
    <PageLayout title="Dashboard" description="How your licenses are doing.">
      <StatRow
        items={[
          {
            label: "Active licenses",
            value: stats.activeLicenses,
            hint: trend ? `${trend > 0 ? "+" : ""}${trend}% issued vs previous 30 days` : undefined,
          },
          { label: "Customers", value: stats.totalCustomers },
          { label: "Devices", value: stats.totalActivations, hint: "Active activations" },
          { label: "Products", value: stats.totalProducts, hint: `${stats.activeProducts} on sale` },
        ]}
      />

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Section title="Licenses issued per week" className="mt-0">
          <WeeklyChart weeks={stats.weekly} />
        </Section>

        <Section title="Expiring in 30 days" className="mt-0">
          {stats.expiringLicenses.length === 0 ? (
            <p className="border-t border-border py-4 text-sm text-muted-foreground">Nothing expires soon.</p>
          ) : (
            <ul className="border-t border-border text-sm">
              {stats.expiringLicenses.map((l) => (
                <li key={l.id} className="border-b border-border">
                  <Link
                    to="/licenses/$licenseId"
                    params={{ licenseId: l.id }}
                    className="flex items-center justify-between gap-4 py-3 hover:text-vibrant"
                  >
                    <Mono className="truncate">{l.key}</Mono>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{formatDate(l.expiresAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section
        title="Recent licenses"
        actions={
          <Link to="/licenses" className="text-vibrant hover:underline">
            View all
          </Link>
        }
      >
        <DataTable
          rows={stats.recentLicenses}
          rowKey={(l) => l.id}
          href={(l) => `/licenses/${l.id}`}
          empty="No licenses yet. They appear here when a customer pays through Stripe."
          columns={[
            { header: "License key", width: "minmax(0,2fr)", cell: (l) => <Mono>{l.key}</Mono> },
            { header: "Product", width: "minmax(0,1.5fr)", cell: (l) => <span className="truncate">{l.product?.name}</span> },
            { header: "Customer", width: "minmax(0,1.5fr)", cell: (l) => <span className="truncate">{l.customer?.name}</span> },
            { header: "Status", width: "7rem", cell: (l) => <Status status={licenseState(l.status, l.expiresAt)} /> },
            {
              header: "Issued",
              width: "7rem",
              cell: (l) => <span className="tabular-nums text-muted-foreground">{formatDate(l.createdAt)}</span>,
            },
          ]}
        />
      </Section>
    </PageLayout>
  );
}
