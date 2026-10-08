import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/page-layout";
import {
  getBrandingSettings,
  updateBrandingSettings,
  resetBrandingSettings,
} from "@/functions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import {
  RotateCcw,
  Sparkles,
  ArrowRight,
  ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { SettingsTabs } from "@/components/top-nav";

export const Route = createFileRoute("/_auth/settings/branding")({
  component: BrandingPage,
  loader: async () => {
    const branding = await getBrandingSettings();
    return { branding };
  },
});

function BrandingPage() {
  const { branding } = Route.useLoaderData();
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [logo, setLogo] = useState(branding.brandLogo || "");
  const [accentColor, setAccentColor] = useState(
    branding.brandAccentColor || "#C2461A"
  );
  const [supportEmail, setSupportEmail] = useState(
    branding.brandSupportEmail || ""
  );
  const [hidePoweredBy, setHidePoweredBy] = useState(
    branding.brandHidePoweredBy || false
  );

  const submitUpdate = useServerFn(updateBrandingSettings);
  const submitReset = useServerFn(resetBrandingSettings);

  const handleSave = async () => {
    setSaving(true);
    try {
      await submitUpdate({
        data: {
          brandLogo: logo || null,
          brandAccentColor: accentColor || null,
          brandSupportEmail: supportEmail || null,
          brandHidePoweredBy: hidePoweredBy,
        },
      });
      toast.success("Branding settings saved");
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save branding"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await submitReset({});
      setLogo("");
      setAccentColor("#C2461A");
      setSupportEmail("");
      setHidePoweredBy(false);
      setResetOpen(false);
      toast.success("Branding reset to defaults");
      router.invalidate();
    } catch (error) {
      toast.error("Failed to reset branding");
    }
  };

  // Check if user has access
  if (!branding.featureEnabled) {
    return (
      <PageLayout
        title="Settings"
        description="Customize your customer portal and emails with your brand."
        tabs={<SettingsTabs />}
      >
        <div className="max-w-3xl">
          <div className="rounded-md border border-border bg-muted/30 p-8 text-center">
            <h2 className="text-xl font-medium mb-2">
              Custom Branding is a Business Feature
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upgrade to the Business plan to customize your customer portal
              with your own logo, colors, and remove "Powered by Perpetually"
              branding.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="vibrant"
               
                asChild
              >
                <Link to="/settings/billing">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade to Business
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Settings"
      description="Customize your customer portal and emails with your brand."
      tabs={<SettingsTabs />}
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setResetOpen(true)}
            disabled={!branding.brandingEnabled}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to default
          </Button>
          <Button
            variant="vibrant"
           
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      }
    >
      <div className="max-w-3xl space-y-6">
        {/* Preview Link */}
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium">Preview your portal</p>
                <p className="text-sm text-muted-foreground">
                  See how your branding looks to customers
                </p>
              </div>
            </div>
            {branding.sampleCustomerId ? (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/portal/${branding.slug}/${branding.sampleCustomerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open portal
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ExternalLink className="h-4 w-4 mr-2" />
                No customers yet
              </Button>
            )}
          </div>
        </div>

        {/* Logo */}
        <div className="rounded-md border border-border overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-medium">Logo</h2>
                <p className="text-sm text-muted-foreground">
                  Your logo displayed in the portal header
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                type="url"
                placeholder="https://example.com/logo.png"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL to your logo image. Recommended size: 200x50px
              </p>
            </div>
            {logo && (
              <div className="p-4 bg-muted/30 rounded-md">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <img
                  src={logo}
                  alt="Logo preview"
                  className="h-10 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Accent Color */}
        <div className="rounded-md border border-border overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-medium">Accent color</h2>
                <p className="text-sm text-muted-foreground">
                  Primary color for buttons and accents
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="accentColor">Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="accentColor"
                    type="text"
                    placeholder="#C2461A"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="font-mono"
                  />
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-14 rounded-md border border-border cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted/30 rounded-md space-y-3">
              <p className="text-xs text-muted-foreground">Preview:</p>
              <div className="flex items-center gap-3">
                <button
                  className="px-4 py-2 rounded-md text-white text-sm font-medium"
                  style={{ backgroundColor: accentColor }}
                >
                  Primary button
                </button>
                <span
                  className="text-sm font-medium"
                  style={{ color: accentColor }}
                >
                  Accent text
                </span>
                <div
                  className="h-6 w-6 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Support Email */}
        <div className="rounded-md border border-border overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-medium">Support email</h2>
                <p className="text-sm text-muted-foreground">
                  Contact email shown in the portal
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Email address</Label>
              <Input
                id="supportEmail"
                type="email"
                placeholder="support@yourcompany.com"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Customers will see this as your support contact
              </p>
            </div>
          </div>
        </div>

        {/* Hide Powered By */}
        <div className="rounded-md border border-border overflow-hidden">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-medium">White label</h2>
                <p className="text-sm text-muted-foreground">
                  Remove Perpetually branding from your portal
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Hide "Powered by Perpetually"</p>
                <p className="text-sm text-muted-foreground">
                  Remove the Perpetually footer from your customer portal
                </p>
              </div>
              <Switch
                checked={hidePoweredBy}
                onCheckedChange={setHidePoweredBy}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reset Dialog */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Branding?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all custom branding and restore the default
              Perpetually branding on your customer portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset branding
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
