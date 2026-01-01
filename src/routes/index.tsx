import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Key,
  Shield,
  Zap,
  BarChart3,
  ArrowRight,
  Check,
  Terminal,
  Sparkles,
  Globe,
  Clock,
  Lock,
  ChevronRight,
  Copy,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Navigation />
      <Hero />
      <LogoCloud />
      <BentoFeatures />
      <CodePreview />
      <Stats />
      <WhyPerpetually />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function Navigation() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-vibrant shadow-lg shadow-vibrant/25 transition-transform group-hover:scale-105">
            <span className="text-sm font-bold text-white">P</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Perpetually</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-muted">
            Features
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-muted">
            Pricing
          </a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-muted">
            Docs
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            Sign in
          </Link>
          <Button variant="vibrant" size="sm" className="shadow-lg shadow-vibrant/25" asChild>
            <Link to="/register">
              Get Started
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-vibrant/20 rounded-full blur-[128px] opacity-60" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-vibrant/10 rounded-full blur-[100px] opacity-40" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-vibrant/30 bg-vibrant/5 text-sm mb-8 group cursor-default">
            <Sparkles className="h-3.5 w-3.5 text-vibrant" />
            <span className="text-vibrant font-medium">Stripe-powered licensing</span>
            <ChevronRight className="h-3.5 w-3.5 text-vibrant/60 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            License keys that
            <br />
            <span className="text-gradient-vibrant">just work</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Generate, validate, and manage software licenses with a simple REST API.
            Sell software with Stripe, manage licenses from one dashboard.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="vibrant"
              size="lg"
              className="w-full sm:w-auto h-12 px-8 text-base shadow-xl shadow-vibrant/30 hover:shadow-vibrant/40 transition-shadow"
              asChild
            >
              <Link to="/register">
                Start building free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12 px-8 text-base border-border/60"
              asChild
            >
              <a href="#features">
                See how it works
              </a>
            </Button>
          </div>

          {/* Trust line */}
          <p className="mt-6 text-sm text-muted-foreground/80">
            Free to start &middot; No credit card required &middot; Setup in 5 minutes
          </p>
        </div>

        {/* Product preview */}
        <div className="mt-16 md:mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none h-32 bottom-0 top-auto" />

          <div className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-2xl shadow-black/10 overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-muted/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-muted text-xs text-muted-foreground font-mono">
                  app.perpetually.dev/licenses
                </div>
              </div>
              <div className="w-12" />
            </div>

            {/* Dashboard preview */}
            <div className="p-6 bg-gradient-to-b from-muted/20 to-transparent">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Active Licenses", value: "2,847", change: "+12%" },
                  { label: "This Month", value: "$18,420", change: "+8%" },
                  { label: "Activations", value: "9,182", change: "+24%" },
                  { label: "Customers", value: "1,293", change: "+15%" },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 rounded-xl bg-card border border-border/40">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-success font-medium mt-1">{stat.change}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
                  <span className="font-medium text-sm">Recent Licenses</span>
                  <span className="text-xs text-vibrant font-medium">View all</span>
                </div>
                <div className="divide-y divide-border/40">
                  {[
                    { key: "PERP-X8K2-M9N1-Q4W7", product: "Pro License", status: "active", customer: "john@acme.co" },
                    { key: "PERP-L3H9-P5R2-K8Y4", product: "Team License", status: "active", customer: "sarah@startup.io" },
                    { key: "PERP-T7B4-N2F6-J9M1", product: "Enterprise", status: "active", customer: "dev@bigcorp.com" },
                  ].map((license) => (
                    <div key={license.key} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-vibrant/10 flex items-center justify-center">
                          <Key className="h-4 w-4 text-vibrant" />
                        </div>
                        <div>
                          <p className="font-mono text-sm">{license.key}</p>
                          <p className="text-xs text-muted-foreground">{license.customer}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{license.product}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-success" />
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LogoCloud() {
  return (
    <section className="py-12 border-y border-border/40 bg-muted/20">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-sm text-muted-foreground mb-8">
          Built for developers selling desktop apps, CLIs, plugins, and more
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60">
          {["Desktop Apps", "CLI Tools", "Plugins", "SDKs", "APIs", "SaaS Add-ons"].map((type) => (
            <div key={type} className="text-lg font-semibold tracking-tight">
              {type}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoFeatures() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-vibrant mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Everything you need to sell software
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            A complete licensing platform that handles the complexity so you can focus on building.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Large feature card */}
          <div className="lg:col-span-2 group relative rounded-3xl border border-border/60 bg-card p-8 transition-all hover:border-vibrant/40 hover:shadow-xl hover:shadow-vibrant/5 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-vibrant/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-vibrant text-white shadow-lg shadow-vibrant/25">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-semibold">Stripe-Powered Sales</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed max-w-lg">
                Connect your Stripe account once. When customers purchase your products,
                licenses are created automatically. Handle refunds, manage subscriptions—all synced.
              </p>
              <div className="mt-6 flex gap-3 flex-wrap">
                <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-success/10 text-success border border-success/20">
                  Auto-sync products
                </span>
                <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-success/10 text-success border border-success/20">
                  Webhook handling
                </span>
                <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-success/10 text-success border border-success/20">
                  Refund detection
                </span>
              </div>
            </div>
          </div>

          {/* Regular feature card */}
          <div className="group relative rounded-3xl border border-border/60 bg-card p-8 transition-all hover:border-vibrant/40 hover:shadow-xl hover:shadow-vibrant/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant/10 text-vibrant">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-lg font-semibold">Simple REST API</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Validate, activate, and deactivate licenses with a clean API. OpenAPI docs included.
            </p>
          </div>

          {/* More cards */}
          <div className="group relative rounded-3xl border border-border/60 bg-card p-8 transition-all hover:border-vibrant/40 hover:shadow-xl hover:shadow-vibrant/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant/10 text-vibrant">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-lg font-semibold">Customer Portal</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Customers can view licenses, regenerate keys, manage activations, and see their activity history.
            </p>
          </div>

          <div className="group relative rounded-3xl border border-border/60 bg-card p-8 transition-all hover:border-vibrant/40 hover:shadow-xl hover:shadow-vibrant/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant/10 text-vibrant">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-lg font-semibold">Activation Limits</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Control how many devices can use a license. Customers can remove old activations themselves.
            </p>
          </div>

          <div className="group relative rounded-3xl border border-border/60 bg-card p-8 transition-all hover:border-vibrant/40 hover:shadow-xl hover:shadow-vibrant/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant/10 text-vibrant">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-lg font-semibold">Expiration & Notifications</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Set expiration dates. Automatic email notifications 7 days, 1 day before, and on expiry.
            </p>
          </div>

          {/* Wide card at bottom */}
          <div className="lg:col-span-3 group relative rounded-3xl border border-border/60 bg-gradient-to-br from-card to-muted/20 p-8 transition-all hover:border-vibrant/40 hover:shadow-xl hover:shadow-vibrant/5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vibrant/10 text-vibrant shrink-0">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Dashboard & Audit Trail</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                    See your products, customers, and licenses at a glance. Every license event is logged—
                    activations, key regenerations, status changes. Full visibility into your business.
                  </p>
                </div>
              </div>
              <div className="flex gap-8">
                {[
                  { value: "99.9%", label: "Uptime" },
                  { value: "<50ms", label: "API Latency" },
                  { value: "REST", label: "API" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-2xl font-bold text-vibrant">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CodePreview() {
  const [copied, setCopied] = useState(false);

  const code = `// Validate a license in your app
const response = await fetch('https://your-server.com/api/v1/validate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    licenseId: 'license-uuid-here',
    key: 'ABCD-1234-EFGH-5678'
  })
});

const { valid, license, error } = await response.json();

if (valid) {
  console.log('License valid until:', license.expiresAt);
  console.log('Activations:', license.activations, '/', license.activationLimit);
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 bg-muted/30 border-y border-border/40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-medium text-vibrant mb-3">Developer Experience</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Simple API,<br />no complexity
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              A clean REST API that works with any stack.
              Validate licenses with a single POST request.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                "RESTful API with OpenAPI documentation",
                "Swagger UI included at /api/v1/ui",
                "Validate, activate, and deactivate endpoints",
                "API keys managed in your dashboard",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-vibrant/10 shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-vibrant" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Button variant="vibrant" asChild>
                <Link to="/login">
                  View API docs
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Code block */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-vibrant/20 to-vibrant/5 rounded-3xl blur-2xl opacity-30" />
            <div className="relative rounded-2xl border border-border/60 bg-[#0d1117] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-mono">validate.ts</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="p-6 text-sm overflow-x-auto">
                <code className="text-[#c9d1d9] font-mono leading-relaxed">
                  <span className="text-[#8b949e]">{"// Validate a license in your app"}</span>{"\n"}
                  <span className="text-[#ff7b72]">const</span>{" "}
                  <span className="text-[#c9d1d9]">response</span>{" "}
                  <span className="text-[#ff7b72]">=</span>{" "}
                  <span className="text-[#ff7b72]">await</span>{" "}
                  <span className="text-[#d2a8ff]">fetch</span>
                  <span className="text-[#c9d1d9]">(</span>
                  <span className="text-[#a5d6ff]">'https://your-server.com/api/v1/validate'</span>
                  <span className="text-[#c9d1d9]">, {"{"}</span>{"\n"}
                  {"  "}<span className="text-[#c9d1d9]">method:</span>{" "}
                  <span className="text-[#a5d6ff]">'POST'</span>
                  <span className="text-[#c9d1d9]">,</span>{"\n"}
                  {"  "}<span className="text-[#c9d1d9]">headers: {"{"}</span>{"\n"}
                  {"    "}<span className="text-[#a5d6ff]">'Authorization'</span>
                  <span className="text-[#c9d1d9]">:</span>{" "}
                  <span className="text-[#a5d6ff]">'Bearer sk_live_...'</span>
                  <span className="text-[#c9d1d9]">,</span>{"\n"}
                  {"    "}<span className="text-[#a5d6ff]">'Content-Type'</span>
                  <span className="text-[#c9d1d9]">:</span>{" "}
                  <span className="text-[#a5d6ff]">'application/json'</span>{"\n"}
                  {"  "}<span className="text-[#c9d1d9]">{"}"},</span>{"\n"}
                  {"  "}<span className="text-[#c9d1d9]">body:</span>{" "}
                  <span className="text-[#79c0ff]">JSON</span>
                  <span className="text-[#c9d1d9]">.</span>
                  <span className="text-[#d2a8ff]">stringify</span>
                  <span className="text-[#c9d1d9]">({"{"}</span>{"\n"}
                  {"    "}<span className="text-[#c9d1d9]">licenseId:</span>{" "}
                  <span className="text-[#a5d6ff]">'license-uuid'</span>
                  <span className="text-[#c9d1d9]">,</span>{"\n"}
                  {"    "}<span className="text-[#c9d1d9]">key:</span>{" "}
                  <span className="text-[#a5d6ff]">'ABCD-1234-EFGH-5678'</span>{"\n"}
                  {"  "}<span className="text-[#c9d1d9]">{"}"})</span>{"\n"}
                  <span className="text-[#c9d1d9]">{"}"})</span>
                  <span className="text-[#c9d1d9]">;</span>{"\n\n"}
                  <span className="text-[#ff7b72]">const</span>{" "}
                  <span className="text-[#c9d1d9]">{"{"} valid, license {"}"}</span>{" "}
                  <span className="text-[#ff7b72]">=</span>{" "}
                  <span className="text-[#ff7b72]">await</span>{" "}
                  <span className="text-[#c9d1d9]">response.</span>
                  <span className="text-[#d2a8ff]">json</span>
                  <span className="text-[#c9d1d9]">();</span>{"\n\n"}
                  <span className="text-[#ff7b72]">if</span>{" "}
                  <span className="text-[#c9d1d9]">(valid) {"{"}</span>{"\n"}
                  {"  "}<span className="text-[#8b949e]">{"// License is active, unlock features"}</span>{"\n"}
                  {"  "}<span className="text-[#c9d1d9]">console.</span>
                  <span className="text-[#d2a8ff]">log</span>
                  <span className="text-[#c9d1d9]">(license.expiresAt);</span>{"\n"}
                  <span className="text-[#c9d1d9]">{"}"}</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "99.9%", label: "Uptime", sublabel: "always available" },
            { value: "<50ms", label: "API Response", sublabel: "p99 latency" },
            { value: "Stripe", label: "Native", sublabel: "auto-sync" },
            { value: "5 min", label: "Setup", sublabel: "to first license" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-4xl md:text-5xl font-bold tracking-tight text-gradient-vibrant">
                {stat.value}
              </p>
              <p className="mt-2 font-medium">{stat.label}</p>
              <p className="text-sm text-muted-foreground">{stat.sublabel}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyPerpetually() {
  return (
    <section className="py-24 bg-muted/20 border-y border-border/40">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
          Why developers choose Perpetually
        </h2>

        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Stop building license key systems from scratch. Perpetually handles the complexity
          so you can focus on shipping your product and growing your business.
        </p>

        <div className="mt-10 grid md:grid-cols-3 gap-6 text-left">
          {[
            { title: "Stripe Native", desc: "Products sync automatically. Licenses created on purchase. Refunds handled." },
            { title: "Customer Portal", desc: "Your customers can manage their licenses, view keys, and handle activations." },
            { title: "Full Visibility", desc: "Dashboard shows everything. Audit trail logs every action. No black boxes." },
          ].map((item) => (
            <div key={item.title} className="p-4 rounded-2xl bg-background border border-border/40">
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-vibrant mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free, scale as you grow. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free tier */}
          <div className="rounded-3xl border border-border/60 bg-card p-8">
            <h3 className="font-semibold">Starter</h3>
            <p className="text-sm text-muted-foreground mt-1">For getting started</p>
            <p className="mt-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </p>
            <ul className="mt-8 space-y-4">
              {["100 licenses", "3 products", "Customer portal", "Email notifications", "Community support"].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-vibrant" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full mt-8" asChild>
              <Link to="/register">Get started free</Link>
            </Button>
          </div>

          {/* Pro tier */}
          <div className="rounded-3xl border-2 border-vibrant bg-card p-8 relative shadow-xl shadow-vibrant/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-vibrant text-white text-xs font-medium">
              Most popular
            </div>
            <h3 className="font-semibold">Pro</h3>
            <p className="text-sm text-muted-foreground mt-1">For growing businesses</p>
            <p className="mt-6">
              <span className="text-4xl font-bold">$29</span>
              <span className="text-muted-foreground">/month</span>
            </p>
            <ul className="mt-8 space-y-4">
              {["Unlimited licenses", "Unlimited products", "Customer portal", "Email notifications", "Priority support", "API access"].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-vibrant" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="vibrant" className="w-full mt-8 shadow-lg shadow-vibrant/25" asChild>
              <Link to="/register">Start free trial</Link>
            </Button>
          </div>

          {/* Business tier */}
          <div className="rounded-3xl border border-border/60 bg-card p-8">
            <h3 className="font-semibold">Business</h3>
            <p className="text-sm text-muted-foreground mt-1">For larger teams</p>
            <p className="mt-6">
              <span className="text-4xl font-bold">$99</span>
              <span className="text-muted-foreground">/month</span>
            </p>
            <ul className="mt-8 space-y-4">
              {["Everything in Pro", "Multiple team members", "Custom branding", "Advanced analytics", "Dedicated support", "SLA guarantee"].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-vibrant" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full mt-8" asChild>
              <Link to="/register">Contact us</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-vibrant via-vibrant to-[hsl(30,95%,50%)] p-12 md:p-16">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl" />

          <div className="relative max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Ready to start selling?
            </h2>
            <p className="mt-4 text-white/80 text-lg">
              Connect your Stripe account, sync your products, and start issuing licenses
              in minutes. No complex setup, no code required.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="bg-white text-vibrant hover:bg-white/90 shadow-xl h-12 px-8"
                asChild
              >
                <Link to="/register">
                  Start free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 h-12 px-8"
                asChild
              >
                <a href="#features">
                  See how it works
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/40 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-vibrant">
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <span className="font-semibold">Perpetually</span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
          </nav>

          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Perpetually. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
