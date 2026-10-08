import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Copy, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { PageLayout } from "@/components/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPlaygroundData } from "@/functions/demo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_auth/playground")({
  beforeLoad: ({ context }) => {
    if (!context.organization?.sandboxExpiresAt) throw redirect({ to: "/dashboard" });
  },
  loader: () => getPlaygroundData(),
  component: PlaygroundPage,
});

type Endpoint = "validate" | "activate" | "deactivate";

const ENDPOINTS: { id: Endpoint; title: string; description: string }[] = [
  { id: "validate", title: "Validate", description: "Check a key and get its status, expiry and activations." },
  { id: "activate", title: "Activate", description: "Register a device against a license (respects the activation limit)." },
  { id: "deactivate", title: "Deactivate", description: "Free up a device slot by removing an activation." },
];

type ApiResponse = { status: number; ms: number; body: unknown };

function PlaygroundPage() {
  const { apiKey, licenses } = Route.useLoaderData();
  const [endpoint, setEndpoint] = useState<Endpoint>("validate");
  const [licenseId, setLicenseId] = useState(licenses[0]?.id ?? "");
  const [deviceName, setDeviceName] = useState("Office iMac");
  const [activationId, setActivationId] = useState("");
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const selected = licenses.find((l) => l.id === licenseId);

  const body = useMemo(() => {
    if (endpoint === "validate") return { licenseId, key: selected?.key ?? "" };
    if (endpoint === "activate") return { licenseId, name: deviceName };
    return { activationId };
  }, [endpoint, licenseId, selected, deviceName, activationId]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const curl = [
    `curl -X POST ${origin}/api/v1/${endpoint} \\`,
    `  -H "Authorization: Bearer ${apiKey}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${JSON.stringify(body)}'`,
  ].join("\n");

  const send = async () => {
    setSending(true);
    const started = performance.now();
    try {
      const res = await fetch(`/api/v1/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setResponse({ status: res.status, ms: Math.round(performance.now() - started), body: json });
      // Chain requests: a fresh activation can be deactivated next
      if (endpoint === "activate" && json?.activation?.id) setActivationId(json.activation.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <PageLayout
      title="API Playground"
      description="Call the real license API with your sandbox's secret key."
      breadcrumbs={[{ label: "API Playground" }]}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request */}
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-2">
            {ENDPOINTS.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  setEndpoint(e.id);
                  setResponse(null);
                }}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left transition-colors",
                  endpoint === e.id
                    ? "border-vibrant bg-vibrant/5"
                    : "border-border/60 hover:bg-muted/50"
                )}
              >
                <span className="block text-xs font-mono text-muted-foreground">POST</span>
                <span className="font-medium">/{e.id}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {ENDPOINTS.find((e) => e.id === endpoint)?.description}
          </p>

          {endpoint !== "deactivate" && (
            <div className="space-y-2">
              <Label>License</Label>
              <Select value={licenseId} onValueChange={setLicenseId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {licenses.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="font-mono">{l.key}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {l.productName} · {l.customerName}
                        {l.status === "disabled" && " · disabled"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {endpoint === "activate" && (
            <div className="space-y-2">
              <Label htmlFor="device">Device name</Label>
              <Input id="device" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} />
            </div>
          )}

          {endpoint === "deactivate" && (
            <div className="space-y-2">
              <Label htmlFor="activation">Activation ID</Label>
              <Input
                id="activation"
                className="font-mono"
                placeholder="Run /activate first, or paste an activation ID"
                value={activationId}
                onChange={(e) => setActivationId(e.target.value)}
              />
            </div>
          )}

          <div className="relative rounded-2xl border border-border/60 bg-[#0d1117] p-4">
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-2 h-8 w-8 text-white/60 hover:text-white"
              onClick={() => {
                navigator.clipboard.writeText(curl);
                toast.success("Copied curl command");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <pre className="overflow-x-auto text-xs leading-relaxed text-[#c9d1d9]">
              <code>{curl}</code>
            </pre>
          </div>

          <Button variant="vibrant" onClick={send} disabled={sending || !apiKey}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Send request
          </Button>
        </div>

        {/* Response */}
        <div className="rounded-2xl border border-border/60 bg-card">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <span className="text-sm font-medium">Response</span>
            {response && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={response.status < 300 ? "default" : "destructive"}>{response.status}</Badge>
                {response.ms} ms
              </span>
            )}
          </div>
          <pre className="min-h-64 overflow-x-auto p-4 text-xs leading-relaxed">
            <code>
              {response
                ? JSON.stringify(response.body, null, 2)
                : "Send a request to see the response.\n\nTry activating the same license until you hit its\nactivation limit, or validate a disabled license."}
            </code>
          </pre>
        </div>
      </div>
    </PageLayout>
  );
}
