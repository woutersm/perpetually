import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { TryDemoButton } from "@/components/try-demo-button";
import { getAppConfig } from "@/functions/demo";
import { Wordmark } from "@/components/top-nav";

export const Route = createFileRoute("/")({
  component: LandingPage,
  loader: () => getAppConfig(),
});

function useDemoMode() {
  return Route.useLoaderData().demoMode;
}

/** Sign-up link, or a one-click sandbox when the app runs as a public demo */
function CtaButton({
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "asChild" | "onClick">) {
  const demoMode = useDemoMode();
  if (demoMode) return <TryDemoButton {...props}>{children}</TryDemoButton>;
  return (
    <Button {...props} asChild>
      <Link to="/register">{children}</Link>
    </Button>
  );
}

const SECTION = "mx-auto w-full max-w-[1100px] px-6";

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <ApiSection />
        <Pricing />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}

function Navigation() {
  const demoMode = useDemoMode();
  return (
    <header className="border-b border-border">
      <div className={`${SECTION} flex h-14 items-center gap-8`}>
        <Link to="/">
          <Wordmark />
        </Link>
        <nav className="hidden flex-1 gap-6 text-sm text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#api" className="hover:text-foreground">API</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <CtaButton variant="vibrant" size="sm">
            {demoMode ? "Try the demo" : "Get started"}
          </CtaButton>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const demoMode = useDemoMode();
  return (
    <section className={`${SECTION} pb-20 pt-24`}>
      <p className="label-caps">License keys for Stripe</p>
      <h1 className="mt-4 max-w-3xl text-5xl leading-[1.1] tracking-tight md:text-6xl">
        Sell your software through Stripe. We handle the license keys.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        A payment creates a key, your app checks it with one API call, and you see every
        license, device and refund in one place.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <CtaButton variant="vibrant" size="lg">
          {demoMode ? "Try the live demo" : "Start for free"}
          <ArrowRight className="size-4" />
        </CtaButton>
        <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">
          How it works
        </a>
      </div>
      {demoMode && (
        <p className="mt-4 text-sm text-muted-foreground">
          You get a private sandbox with sample data. No sign-up, deleted after 24 hours.
        </p>
      )}

      <div className="mt-16 overflow-hidden rounded-md border border-border bg-card">
        <img
          src="/screenshots/dashboard.png"
          alt="The Perpetually dashboard: active licenses, licenses issued per week and recent licenses"
          className="block w-full"
          width={1440}
          height={1000}
        />
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: "A customer pays",
    text: "They buy your product through Stripe Checkout or a payment link, like any other Stripe sale.",
  },
  {
    title: "A license key is issued",
    text: "Stripe calls our webhook. We create a key using the product's policy and email it to the customer.",
  },
  {
    title: "Your app activates it",
    text: "Your app sends the key to the API. Device limits and expiry dates are enforced on our side.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="border-t border-border">
      <div className={`${SECTION} py-20`}>
        <h2 className="label-caps">How it works</h2>
        <ol className="mt-8 grid border-t border-border md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className={`py-8 md:pr-8 ${i > 0 ? "md:border-l md:border-border md:pl-8" : ""}`}>
              <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
              <h3 className="mt-3 text-lg">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FEATURES = [
  { title: "Stripe as the source of truth", text: "Products sync from Stripe. Refunds are flagged on the license so you can decide what to do." },
  { title: "Device limits", text: "Each policy sets how many machines a key can run on. Customers free up slots themselves." },
  { title: "Perpetual or subscription", text: "Keys can last a year, a trial period or forever, set per product policy." },
  { title: "Customer portal", text: "Customers see their keys, regenerate a leaked one and remove old devices without emailing you." },
  { title: "Audit trail", text: "Every key, device and status change is logged with who did it: you, the API or the customer." },
  { title: "Teams and test mode", text: "Invite your team, and keep Stripe test purchases separate from real ones." },
];

function Features() {
  return (
    <section className="border-t border-border">
      <div className={`${SECTION} py-20`}>
        <h2 className="label-caps">What you get</h2>
        <dl className="mt-8 grid border-t border-border md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`border-b border-border py-6 ${i % 2 === 1 ? "md:border-l md:pl-8" : "md:pr-8"}`}>
              <dt>{f.title}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{f.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

const CODE = `const res = await fetch("https://your-host/api/v1/validate", {
  method: "POST",
  headers: {
    Authorization: "Bearer sk_live_...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ licenseId, key: "7X1S-TT0F-3QAX-Z4F0" }),
});

const { valid, license } = await res.json();
// valid: true, license.expiresAt, license.activations`;

function ApiSection() {
  const demoMode = useDemoMode();
  return (
    <section id="api" className="border-t border-border">
      <div className={`${SECTION} grid gap-12 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]`}>
        <div>
          <h2 className="label-caps">API</h2>
          <p className="mt-4 text-2xl leading-snug">Three endpoints cover the whole lifecycle.</p>
          <ul className="mt-6 border-t border-border text-sm">
            {[
              ["POST /validate", "Is this key valid right now?"],
              ["POST /activate", "Register this machine against the key."],
              ["POST /deactivate", "Free up a device slot."],
            ].map(([endpoint, text]) => (
              <li key={endpoint} className="flex justify-between gap-4 border-b border-border py-3">
                <span className="font-mono text-[13px]">{endpoint}</span>
                <span className="text-muted-foreground">{text}</span>
              </li>
            ))}
          </ul>
          {demoMode && (
            <CtaButton variant="outline" size="sm" className="mt-6">
              Try it in the playground
            </CtaButton>
          )}
        </div>
        <pre className="overflow-x-auto rounded-md border border-border bg-muted/60 p-6 text-[13px] leading-relaxed">
          <code>{CODE}</code>
        </pre>
      </div>
    </section>
  );
}

const PLANS = [
  { name: "Starter", price: "$0", items: ["100 licenses", "3 products", "Customer portal", "Email notifications"] },
  { name: "Pro", price: "$29", items: ["Unlimited licenses and products", "License API", "Priority support"] },
  { name: "Business", price: "$99", items: ["Everything in Pro", "Unlimited team members", "Custom portal branding"] },
];

function Pricing() {
  const demoMode = useDemoMode();
  return (
    <section id="pricing" className="border-t border-border">
      <div className={`${SECTION} py-20`}>
        <h2 className="label-caps">Pricing</h2>
        {demoMode && (
          <p className="mt-2 text-sm text-muted-foreground">
            The plans are part of the demo. No real payments are taken.
          </p>
        )}
        <div className="mt-8 grid border-t border-border md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <div key={plan.name} className={`py-8 md:pr-8 ${i > 0 ? "md:border-l md:border-border md:pl-8" : ""}`}>
              <h3>{plan.name}</h3>
              <p className="mt-2 text-3xl tabular-nums">
                {plan.price}
                <span className="text-sm text-muted-foreground"> / month</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Closing() {
  const demoMode = useDemoMode();
  return (
    <section className="border-t border-border">
      <div className={`${SECTION} flex flex-wrap items-center justify-between gap-6 py-20`}>
        <p className="text-2xl">
          {demoMode ? "See it with real data in under a minute." : "Issue your first license today."}
        </p>
        <CtaButton variant="vibrant" size="lg">
          {demoMode ? "Try the live demo" : "Get started"}
          <ArrowRight className="size-4" />
        </CtaButton>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className={`${SECTION} flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-muted-foreground`}>
        <Wordmark />
        <span>
          A portfolio project by{" "}
          <a href="https://github.com/woutersm/perpetually" className="underline hover:text-foreground">
            Martijn Wouters
          </a>
        </span>
      </div>
    </footer>
  );
}
