import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PageLayout } from "@/components/page-layout";
import { getBillingInfo, createCheckoutSession, createPortalSession, getTierInfo } from "@/functions/billing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import {
  Zap,
  Package,
  Users,
  Check,
  ArrowRight,
  ExternalLink,
  Shield,
  Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SubscriptionTier } from "@/lib/limits";
import { SettingsTabs } from "@/components/top-nav";

export const Route = createFileRoute("/_auth/settings/billing")({
  component: BillingPage,
  loader: async () => {
    const [billing, tierInfo] = await Promise.all([
      getBillingInfo(),
      getTierInfo(),
    ]);
    return { billing, tierInfo };
  },
});

function BillingPage() {
  const { billing, tierInfo } = Route.useLoaderData();
  const router = useRouter();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"pro" | "business" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const submitCheckout = useServerFn(createCheckoutSession);
  const submitPortal = useServerFn(createPortalSession);

  // Check for success/cancel query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast.success("Subscription updated successfully!");
      // Clear the query params
      window.history.replaceState({}, "", window.location.pathname);
      router.invalidate();
    } else if (params.get("canceled") === "true") {
      toast.info("Checkout canceled");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [router]);

  const handleUpgrade = async (tier: "pro" | "business") => {
    setIsLoading(true);
    try {
      const result = await submitCheckout({ data: { tier } });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const result = await submitPortal();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open billing portal");
      setIsLoading(false);
    }
  };

  const formatLimit = (limit: number) => {
    return limit === Infinity ? "Unlimited" : limit.toLocaleString();
  };

  const getTierBadgeVariant = (tier: SubscriptionTier) => {
    switch (tier) {
      case "starter":
        return "secondary";
      case "pro":
        return "default";
      case "business":
        return "default";
      default:
        return "secondary";
    }
  };

  const getStatusBadge = () => {
    if (billing.isTrialing && billing.trialEndsAt) {
      const daysLeft = Math.ceil(
        (new Date(billing.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Trial: {daysLeft} days left
        </Badge>
      );
    }

    switch (billing.organization.subscriptionStatus) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Check className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case "past_due":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Payment due
          </Badge>
        );
      case "canceled":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Canceled
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="Settings"
      description="Manage your subscription and billing."
      tabs={<SettingsTabs />}
    >
      <div className="space-y-6 max-w-3xl">
        {/* Current Plan */}
        <div className="rounded-md border border-border overflow-hidden">
          <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="font-medium">Current plan</h2>
                  <p className="text-sm text-muted-foreground">
                    Your subscription details
                  </p>
                </div>
              </div>
              {getStatusBadge()}
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={getTierBadgeVariant(billing.tier)} className="text-sm px-3 py-1">
                  {billing.tier.charAt(0).toUpperCase() + billing.tier.slice(1)}
                </Badge>
                <span className="text-2xl font-medium">
                  ${billing.price}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2 empty:hidden">
                {billing.tier !== "business" && (
                  <Button
                    variant="vibrant"
                    onClick={() => setUpgradeOpen(true)}
                   
                  >
                    <Zap className="h-4 w-4" />
                    Upgrade
                  </Button>
                )}
                {billing.hasPaymentMethod && (
                  <Button variant="outline" onClick={handleManageBilling} disabled={isLoading}>
                    <ExternalLink className="h-4 w-4" />
                    Manage billing
                  </Button>
                )}
              </div>
            </div>

            {billing.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                {billing.isTrialing ? "Trial ends" : "Next billing date"}:{" "}
                <span className="font-medium text-foreground">
                  {new Date(billing.currentPeriodEnd).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Usage */}
        <div className="rounded-md border border-border overflow-hidden">
          <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-medium">Usage</h2>
                <p className="text-sm text-muted-foreground">
                  Your current resource usage
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-6 p-4 sm:p-6">
            {/* Licenses */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Licenses</span>
                <span className="text-sm text-muted-foreground">
                  {billing.usage.licenses.current.toLocaleString()} / {formatLimit(billing.usage.licenses.limit)}
                </span>
              </div>
              <Progress
                value={billing.usage.licenses.percentage}
                className={cn(
                  "h-1",
                  billing.usage.licenses.percentage >= 90 && "bg-warning/15 [&>div]:bg-warning",
                  billing.usage.licenses.percentage >= 100 && "bg-destructive/15 [&>div]:bg-destructive"
                )}
              />
              {billing.usage.licenses.percentage >= 80 && billing.usage.licenses.percentage < 100 && (
                <p className="text-xs text-warning mt-1">
                  Approaching limit. Consider upgrading for unlimited licenses.
                </p>
              )}
              {billing.usage.licenses.percentage >= 100 && (
                <p className="text-xs text-destructive mt-1">
                  Limit reached. Upgrade to create more licenses.
                </p>
              )}
            </div>

            {/* Products */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Products</span>
                <span className="text-sm text-muted-foreground">
                  {billing.usage.products.current.toLocaleString()} / {formatLimit(billing.usage.products.limit)}
                </span>
              </div>
              <Progress
                value={billing.usage.products.percentage}
                className={cn(
                  "h-1",
                  billing.usage.products.percentage >= 90 && "bg-warning/15 [&>div]:bg-warning",
                  billing.usage.products.percentage >= 100 && "bg-destructive/15 [&>div]:bg-destructive"
                )}
              />
            </div>

            {/* Team Members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Team members</span>
                <span className="text-sm text-muted-foreground">
                  {billing.usage.members.current.toLocaleString()} / {formatLimit(billing.usage.members.limit)}
                </span>
              </div>
              <Progress
                value={billing.usage.members.limit === Infinity ? 0 : billing.usage.members.percentage}
                className="h-1"
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="rounded-md border border-border overflow-hidden">
          <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-medium">Features</h2>
                <p className="text-sm text-muted-foreground">
                  What's included in your plan
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureItem
                label="Customer portal"
                enabled={billing.usage.features.customerPortal}
              />
              <FeatureItem
                label="Email notifications"
                enabled={billing.usage.features.emailNotifications}
              />
              <FeatureItem
                label="API access"
                enabled={billing.usage.features.apiAccess}
              />
              <FeatureItem
                label="Custom branding"
                enabled={billing.usage.features.customBranding}
              />
              <FeatureItem
                label="Priority support"
                enabled={billing.usage.features.prioritySupport}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Choose a Plan</DialogTitle>
            <DialogDescription>
              Upgrade to unlock more features and remove limits. Start with a 14-day free trial.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-3">
            {tierInfo.tiers.map((tier) => (
              <div
                key={tier.id}
                className={cn(
                  "relative rounded-md border p-5 cursor-pointer transition-all",
                  billing.tier === tier.id && "border-foreground",
                  selectedTier === tier.id && tier.id !== billing.tier && "border-vibrant ring-2 ring-vibrant/20",
                  tier.id === billing.tier && "cursor-default"
                )}
                onClick={() => tier.id !== billing.tier && tier.id !== "starter" && setSelectedTier(tier.id as "pro" | "business")}
              >
                {tier.popular && (
                  <Badge className="absolute -top-2 right-4 bg-vibrant">Popular</Badge>
                )}
                <h3 className="font-medium mb-1">{tier.name}</h3>
                <p className="text-2xl font-medium mb-1">
                  ${tier.price}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{formatLimit(tier.limits.licenses)} licenses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span>{formatLimit(tier.limits.products)} products</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{formatLimit(tier.limits.members)} team members</span>
                  </div>
                </div>

                {billing.tier === tier.id && (
                  <div className="mt-4 pt-4 border-t">
                    <Badge variant="secondary">Current plan</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <Shield className="h-4 w-4 inline mr-1" />
              14-day free trial. Cancel anytime.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setUpgradeOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="vibrant"
                onClick={() => selectedTier && handleUpgrade(selectedTier)}
                disabled={!selectedTier || isLoading}
               
              >
                {isLoading ? "Loading..." : (
                  <>
                    Continue to Checkout
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

function FeatureItem({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full",
          enabled ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
        )}
      >
        <Check className="h-3 w-3" />
      </div>
      <span className={cn("text-sm", !enabled && "text-muted-foreground")}>{label}</span>
    </div>
  );
}
