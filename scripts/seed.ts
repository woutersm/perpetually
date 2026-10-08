import { eq } from "drizzle-orm";
import { auth } from "../src/lib/auth";
import db from "../src/lib/db/db";
import { user } from "../src/lib/db/schema";
import { createDemoOrganization } from "../src/lib/demo/sample-data";

const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "testpassword123";
const TEST_USER_EMAIL = "test@perpetually.dev";

async function seed() {
  const [existingUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, TEST_USER_EMAIL))
    .limit(1);

  if (existingUser) {
    console.log("Test user already exists, skipping seed");
    return;
  }

  console.log("Creating test user...");
  await auth.api.signUpEmail({
    body: { name: "Test User", email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD },
  });

  const [createdUser] = await db
    .update(user)
    .set({ emailVerified: true })
    .where(eq(user.email, TEST_USER_EMAIL))
    .returning();

  console.log("Creating organization with sample data...");
  const { organization, secretKey } = await createDemoOrganization({
    ownerId: createdUser.id,
    name: "Pixelforge",
    slug: "pixelforge",
  });

  console.log("\n✅ Seed completed successfully!\n");
  console.log("Test credentials:");
  console.log(`  Email: ${TEST_USER_EMAIL}`);
  console.log(`  Password: ${TEST_USER_PASSWORD}`);
  console.log(`\nOrganization: ${organization.name} (${organization.slug})`);
  console.log(`Secret API key: ${secretKey.key}`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
