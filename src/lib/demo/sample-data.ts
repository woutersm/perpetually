/**
 * Sample data for demo organizations.
 *
 * Builds a realistic-looking organization: a few products with policies,
 * ~30 customers and ~80 licenses spread over the last six months, with
 * activations and an audit trail. Uses a seeded PRNG so every sandbox
 * looks the same (stable screenshots), while keys stay unique.
 */
import db from "@/lib/db/db";
import {
  organization,
  membership,
  secretKey,
  product,
  licensePolicy,
  customer,
  license,
  activation,
  licenseEvent,
} from "@/lib/db/schema";
import { generateLicenseKey, generatePublishableKey, generateSecretKey } from "@/lib/keys";

const DAY = 24 * 60 * 60 * 1000;

// mulberry32: tiny deterministic PRNG
function createRandom(seed: number) {
  let a = seed;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
  };
}

type PolicySeed = { name: string; licenseLengthDays: number | null; activationLimit: number | null };

const PRODUCTS: {
  name: string;
  slug: string;
  description: string;
  policies: PolicySeed[];
  weight: number;
}[] = [
  {
    name: "Pixelforge Studio",
    slug: "pixelforge-studio",
    description: "Desktop image editor for macOS and Windows",
    policies: [
      { name: "Annual", licenseLengthDays: 365, activationLimit: 3 },
      { name: "Trial", licenseLengthDays: 14, activationLimit: 1 },
    ],
    weight: 5,
  },
  {
    name: "Pixelforge CLI",
    slug: "pixelforge-cli",
    description: "Batch processing from the command line and CI",
    policies: [{ name: "Perpetual", licenseLengthDays: null, activationLimit: 2 }],
    weight: 3,
  },
  {
    name: "Team Plugin Pack",
    slug: "team-plugin-pack",
    description: "Shared presets and plugins for design teams",
    policies: [{ name: "Annual Team", licenseLengthDays: 365, activationLimit: 10 }],
    weight: 2,
  },
];

const FIRST_NAMES = [
  "Ava", "Liam", "Noah", "Emma", "Mila", "Lucas", "Sofia", "Daan", "Yara", "Finn",
  "Zoe", "Sem", "Nora", "Levi", "Isla", "Jesse", "Lena", "Milan", "Tess", "Owen",
  "Ruby", "Hugo", "Iris", "Max", "Elif", "Kai", "Maya", "Theo", "Saar", "Omar",
];
const LAST_NAMES = [
  "de Vries", "Jansen", "Bakker", "Visser", "Smit", "Meyer", "Novak", "Rossi",
  "Kowalski", "Garcia", "Chen", "Okafor", "Larsen", "Dubois", "Schmidt", "Silva",
];
const COMPANIES = [
  "Northwind Studio", "Brightline Media", "Copperleaf", "Atlas Creative",
  "Fjord Labs", "Kite & Co", "Lumen Works", null, null, null,
];
const DEVICES = [
  "MacBook Pro", "MacBook Air", "iMac", "Windows Desktop", "ThinkPad X1",
  "Studio Workstation", "Build Server", "Linux Laptop",
];
const DISABLE_REASONS = [
  { reason: "refund", notes: "Customer requested a refund within 30 days" },
  { reason: "chargeback", notes: "Card issuer chargeback" },
  { reason: "customer_request", notes: "Duplicate purchase" },
] as const;

/**
 * Create an organization with an owner and full sample data.
 * Used by `scripts/seed.ts` and by per-visitor demo sandboxes.
 */
export async function createDemoOrganization({
  ownerId,
  name,
  slug,
  sandboxExpiresAt = null,
}: {
  ownerId: string;
  name: string;
  slug: string;
  sandboxExpiresAt?: Date | null;
}) {
  const rand = createRandom(42);
  const now = Date.now();

  const [org] = await db
    .insert(organization)
    .values({
      name,
      slug,
      apiKey: generatePublishableKey(),
      isOnboarded: true,
      sandboxExpiresAt,
      // Show every feature (branding, unlimited licenses) in the demo
      subscriptionTier: "business",
      subscriptionStatus: "active",
    })
    .returning();

  await db.insert(membership).values({ userId: ownerId, organizationId: org.id, role: "owner" });

  const [apiKey] = await db
    .insert(secretKey)
    .values({ key: generateSecretKey(), name: "Production", organizationId: org.id })
    .returning();

  // Products + policies
  const products = await db
    .insert(product)
    .values(
      PRODUCTS.map((p) => ({
        name: p.name,
        slug: p.slug,
        description: p.description,
        stripeProductId: `prod_demo_${p.slug.replace(/-/g, "_")}`,
        syncedAt: new Date(now - 180 * DAY),
        createdAt: new Date(now - 190 * DAY),
        organizationId: org.id,
      }))
    )
    .returning();

  const policyRows = PRODUCTS.flatMap((p, i) =>
    p.policies.map((policy) => ({ ...policy, productId: products[i].id }))
  );
  await db.insert(licensePolicy).values(policyRows);

  // Customers, joining over the last six months
  const customerValues = Array.from({ length: 32 }, (_, i) => {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = rand.pick(LAST_NAMES);
    const handle = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "");
    return {
      name: `${first} ${last}`,
      email: `${handle}${i}@example.com`,
      company: rand.pick(COMPANIES),
      stripeCustomerId: `cus_demo_${i.toString().padStart(4, "0")}`,
      createdAt: new Date(now - rand.int(2, 180) * DAY),
      organizationId: org.id,
    };
  });
  const customers = await db.insert(customer).values(customerValues).returning();

  // Licenses: skew creation dates toward recent months so the trend grows
  const weightedProducts = PRODUCTS.flatMap((p, i) => Array(p.weight).fill(i) as number[]);
  const licenseValues: (typeof license.$inferInsert)[] = [];
  for (let i = 0; i < 84; i++) {
    const owner = customers[i % customers.length];
    const productIndex = rand.pick(weightedProducts);
    const policy = rand.pick(PRODUCTS[productIndex].policies);
    const ageDays = Math.floor(Math.pow(rand.next(), 1.6) * 180) + 1;
    const createdAt = new Date(Math.max(owner.createdAt.getTime(), now - ageDays * DAY));
    const expiresAt =
      policy.licenseLengthDays === null
        ? null
        : new Date(createdAt.getTime() + policy.licenseLengthDays * DAY);
    const disable = rand.chance(0.08) ? rand.pick(DISABLE_REASONS) : null;

    licenseValues.push({
      key: generateLicenseKey(),
      keyCreatedAt: createdAt,
      createdAt,
      status: disable ? "disabled" : "active",
      disabledAt: disable ? new Date(createdAt.getTime() + rand.int(1, 20) * DAY) : null,
      disabledReason: disable?.reason ?? null,
      disabledNotes: disable?.notes ?? null,
      expiresAt,
      activationLimit: policy.activationLimit,
      stripePaymentIntentId: `pi_demo_${i.toString().padStart(5, "0")}`,
      isTest: rand.chance(0.12),
      productId: products[productIndex].id,
      customerId: owner.id,
      organizationId: org.id,
    });
  }
  const licenses = await db.insert(license).values(licenseValues).returning();

  // Activations + audit trail
  const activationValues: (typeof activation.$inferInsert)[] = [];
  const eventValues: (typeof licenseEvent.$inferInsert)[] = [];

  for (const lic of licenses) {
    const created = lic.createdAt.getTime();
    eventValues.push({
      type: "license.created",
      actorType: "system",
      data: {
        stripePaymentIntentId: lic.stripePaymentIntentId,
        isTest: lic.isTest,
        expiresAt: lic.expiresAt?.toISOString() ?? null,
        activationLimit: lic.activationLimit,
      },
      licenseId: lic.id,
      organizationId: org.id,
      createdAt: lic.createdAt,
    });

    const maxDevices = Math.min(lic.activationLimit ?? 3, 3);
    const deviceCount = lic.status === "disabled" ? 0 : rand.int(0, maxDevices);
    for (let d = 0; d < deviceCount; d++) {
      const activatedAt = new Date(Math.min(now, created + rand.int(0, 10) * DAY + d * 3600_000));
      const id = crypto.randomUUID();
      const name = rand.pick(DEVICES);
      const machineId = `${name.split(" ")[0].toUpperCase()}-${rand.int(1000, 9999)}`;
      activationValues.push({
        id,
        name,
        machineId,
        createdAt: activatedAt,
        lastSeenAt: new Date(now - rand.int(0, 14) * DAY),
        licenseId: lic.id,
        organizationId: org.id,
      });
      eventValues.push({
        type: "activation.created",
        actorType: "api",
        actorId: apiKey.id,
        data: { activationId: id, name, machineId },
        licenseId: lic.id,
        organizationId: org.id,
        createdAt: activatedAt,
      });
    }

    if (lic.status === "disabled" && lic.disabledAt) {
      eventValues.push({
        type: "license.status_changed",
        actorType: "user",
        actorId: ownerId,
        data: {
          previousStatus: "active",
          newStatus: "disabled",
          reason: lic.disabledReason,
          notes: lic.disabledNotes,
        },
        licenseId: lic.id,
        organizationId: org.id,
        createdAt: lic.disabledAt,
      });
    }
  }

  if (activationValues.length) await db.insert(activation).values(activationValues);
  // SQLite caps bound parameters per statement; insert events in chunks
  for (let i = 0; i < eventValues.length; i += 100) {
    await db.insert(licenseEvent).values(eventValues.slice(i, i + 100));
  }

  return { organization: org, secretKey: apiKey };
}
