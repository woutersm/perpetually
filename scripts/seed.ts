import { eq } from "drizzle-orm";
import { auth } from "../src/lib/auth";
import db from "../src/lib/db/db";
import {
  user,
  organization,
  membership,
  product,
  customer,
  license,
  licensePolicy,
} from "../src/lib/db/schema";

const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "testpassword123";
const TEST_USER_EMAIL = "test@perpetually.dev";

// Generate a license key (e.g., XXXX-XXXX-XXXX-XXXX)
function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = 4;
  const segmentLength = 4;

  const parts: string[] = [];
  for (let i = 0; i < segments; i++) {
    let segment = "";
    for (let j = 0; j < segmentLength; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(segment);
  }

  return parts.join("-");
}

async function seed() {
  try {
    // Check if test user already exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, TEST_USER_EMAIL))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("Test user already exists, skipping seed");
      process.exit(0);
    }

    // Create test user via better-auth
    console.log("Creating test user...");
    await auth.api.signUpEmail({
      body: {
        name: "Test User",
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      },
    });

    // Get the created user
    const [createdUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, TEST_USER_EMAIL))
      .limit(1);

    if (!createdUser) {
      throw new Error("Failed to create user");
    }

    // Create test organization
    console.log("Creating test organization...");
    const [org] = await db
      .insert(organization)
      .values({
        name: "Acme Inc",
        slug: "acme",
        apiKey: `pk_${crypto.randomUUID().replace(/-/g, "")}`,
        isOnboarded: true,
      })
      .returning();

    // Create membership (owner)
    console.log("Creating membership...");
    await db.insert(membership).values({
      userId: createdUser.id,
      organizationId: org.id,
      role: "owner",
    });

    // Create sample products
    console.log("Creating sample products...");
    const [product1] = await db
      .insert(product)
      .values({
        name: "Pro License",
        slug: "pro",
        description: "Full featured professional license",
        status: "active",
        organizationId: org.id,
      })
      .returning();

    const [product2] = await db
      .insert(product)
      .values({
        name: "Enterprise License",
        slug: "enterprise",
        description: "Enterprise-grade license with priority support",
        status: "active",
        organizationId: org.id,
      })
      .returning();

    // Create license policies
    console.log("Creating license policies...");
    await db.insert(licensePolicy).values([
      {
        name: "Annual Pro",
        type: "subscription",
        licenseLengthDays: 365,
        activationLimit: 3,
        productId: product1.id,
      },
      {
        name: "Trial",
        type: "trial",
        licenseLengthDays: 14,
        activationLimit: 1,
        productId: product1.id,
      },
      {
        name: "Perpetual Enterprise",
        type: "perpetual",
        licenseLengthDays: 36500, // ~100 years
        activationLimit: null, // unlimited
        productId: product2.id,
      },
    ]);

    // Create sample customers
    console.log("Creating sample customers...");
    const [customer1] = await db
      .insert(customer)
      .values({
        name: "John Doe",
        email: "john@example.com",
        organizationId: org.id,
      })
      .returning();

    const [customer2] = await db
      .insert(customer)
      .values({
        name: "Jane Smith",
        email: "jane@example.com",
        organizationId: org.id,
      })
      .returning();

    // Create sample licenses
    console.log("Creating sample licenses...");
    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    await db.insert(license).values([
      {
        key: generateLicenseKey(),
        keyCreatedAt: now,
        status: "active",
        expiresAt: oneYearFromNow,
        activationLimit: 3,
        productId: product1.id,
        customerId: customer1.id,
        organizationId: org.id,
      },
      {
        key: generateLicenseKey(),
        keyCreatedAt: thirtyDaysAgo,
        status: "active",
        expiresAt: oneYearFromNow,
        activationLimit: null,
        productId: product2.id,
        customerId: customer2.id,
        organizationId: org.id,
      },
      {
        key: generateLicenseKey(),
        keyCreatedAt: thirtyDaysAgo,
        status: "expired",
        expiresAt: thirtyDaysAgo, // Already expired
        activationLimit: 1,
        productId: product1.id,
        customerId: customer1.id,
        organizationId: org.id,
      },
    ]);

    console.log("\n✅ Seed completed successfully!\n");
    console.log("Test credentials:");
    console.log(`  Email: ${TEST_USER_EMAIL}`);
    console.log(`  Password: ${TEST_USER_PASSWORD}`);
    console.log(`\nOrganization: ${org.name} (${org.slug})`);
    console.log(`API Key: ${org.apiKey}`);
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
