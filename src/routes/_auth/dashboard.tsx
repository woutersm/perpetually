import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, StatCard } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Key,
  Users,
  TrendingUp,
  ArrowRight,
  Activity,
  Clock,
  AlertTriangle,
  Plus,
  Sparkles,
} from "lucide-react";
import { getDashboardStats } from "@/functions/dashboard";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
  loader: async ({ context }) => {
    const stats = await getDashboardStats({ data: { isTestMode: context.isTestMode } });
    return { stats };
  },
});

function DashboardPage() {
  const { stats } = Route.useLoaderData();

  return (
    <PageLayout
      title="Dashboard"
      description="Overview of your license management activity"
      breadcrumbs={[{ label: "Dashboard" }]}
    >
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon={<Package className="h-5 w-5" />}
            description={`${stats.activeProducts} active`}
          />
          <StatCard
            title="Active Licenses"
            value={stats.activeLicenses}
            icon={<Key className="h-5 w-5" />}
            variant="vibrant"
            trend={stats.licenseTrend ? { value: stats.licenseTrend, label: "vs last month" } : undefined}
          />
          <StatCard
            title="Customers"
            value={stats.totalCustomers}
            icon={<Users className="h-5 w-5" />}
            description="Total registered"
          />
          <StatCard
            title="Activations"
            value={stats.totalActivations}
            icon={<Activity className="h-5 w-5" />}
            description="Device activations"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Licenses</h2>
              <Button variant="ghost" size="sm" className="text-vibrant hover:text-vibrant/80" asChild>
                <Link to="/licenses">
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {stats.recentLicenses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
                  <Key className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No licenses issued yet</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Create your first license to start managing your software distribution.
                </p>
                <Button variant="vibrant" className="shadow-lg shadow-vibrant/25" asChild>
                  <Link to="/licenses">
                    <Plus className="h-4 w-4 mr-2" />
                    Create License
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 overflow-hidden">
                <div className="divide-y divide-border/40">
                  {stats.recentLicenses.map((license) => (
                    <Link
                      key={license.id}
                      to="/licenses/$licenseId"
                      params={{ licenseId: license.id }}
                      className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-vibrant/10 group-hover:bg-vibrant/20 transition-colors">
                          <Key className="h-5 w-5 text-vibrant" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-medium">
                            {license.key}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {license.product?.name} &middot; {license.customer?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {(() => {
                          const isExpired = license.status === "active" && license.expiresAt && new Date(license.expiresAt) < new Date();
                          const displayStatus = isExpired ? "expired" : license.status;
                          return (
                            <Badge
                              variant={
                                displayStatus === "active"
                                  ? "outline-success"
                                  : displayStatus === "expired"
                                    ? "outline-warning"
                                    : "outline-destructive"
                              }
                            >
                              {displayStatus}
                            </Badge>
                          );
                        })()}
                        <span className="text-xs text-muted-foreground">
                          {new Date(license.createdAt).toLocaleDateString()}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-vibrant group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions & Alerts */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Quick Actions</h2>
              <div className="grid gap-2">
                <Button variant="outline" className="justify-start h-auto py-4 rounded-xl group" asChild>
                  <Link to="/products">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted group-hover:bg-vibrant/10 transition-colors mr-3">
                      <Package className="h-5 w-5 text-muted-foreground group-hover:text-vibrant transition-colors" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">New Product</p>
                      <p className="text-xs text-muted-foreground">Add a software product</p>
                    </div>
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-4 rounded-xl group" asChild>
                  <Link to="/licenses">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted group-hover:bg-vibrant/10 transition-colors mr-3">
                      <Key className="h-5 w-5 text-muted-foreground group-hover:text-vibrant transition-colors" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Issue License</p>
                      <p className="text-xs text-muted-foreground">Create a new license key</p>
                    </div>
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-4 rounded-xl group" asChild>
                  <Link to="/customers">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted group-hover:bg-vibrant/10 transition-colors mr-3">
                      <Users className="h-5 w-5 text-muted-foreground group-hover:text-vibrant transition-colors" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Add Customer</p>
                      <p className="text-xs text-muted-foreground">Register a new customer</p>
                    </div>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Expiring Soon */}
            {stats.expiringLicenses.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/10">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  </div>
                  <h2 className="text-lg font-semibold">Expiring Soon</h2>
                </div>
                <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 space-y-3">
                  {stats.expiringLicenses.slice(0, 3).map((license) => (
                    <Link
                      key={license.id}
                      to="/licenses/$licenseId"
                      params={{ licenseId: license.id }}
                      className="flex items-center justify-between text-sm hover:opacity-80 transition-opacity"
                    >
                      <span className="font-mono truncate max-w-[140px]">
                        {license.key}
                      </span>
                      <span className="text-xs text-warning flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {license.expiresAt
                          ? new Date(license.expiresAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Growth Indicator */}
            {stats.licenseTrend && stats.licenseTrend > 0 && (
              <div className="rounded-2xl border border-vibrant/20 bg-gradient-to-br from-vibrant/10 to-transparent p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-vibrant shadow-lg shadow-vibrant/25">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-gradient-vibrant">
                      +{stats.licenseTrend}%
                    </span>
                    <span className="text-sm font-medium ml-1">growth</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  License issuance is up compared to last month. Keep it up!
                </p>
              </div>
            )}

            {/* Pro tip */}
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-vibrant" />
                <span className="text-sm font-semibold">Pro tip</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Connect your Stripe account to automatically create licenses when customers purchase your products.
              </p>
              <Button variant="ghost" size="sm" className="mt-3 -ml-2 text-vibrant hover:text-vibrant/80" asChild>
                <Link to="/settings">
                  Set up Stripe
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
