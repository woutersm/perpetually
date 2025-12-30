import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { faker } from "@faker-js/faker";
import Stripe from "stripe";
import invariant from "tiny-invariant";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env.local
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });

const STRIPE_API_KEY = process.env.SEED_STRIPE_API_KEY;
invariant(STRIPE_API_KEY, "SEED_STRIPE_API_KEY environment variable is required");

const stripe = new Stripe(STRIPE_API_KEY, {
  apiVersion: "2025-10-29.clover",
});

async function generateCustomers() {
  const CUSTOMER_COUNT = 50;
  const DOMAIN = "wouters.dev";

  console.log(`Generating ${CUSTOMER_COUNT} Stripe customers...`);

  for (let i = 1; i <= CUSTOMER_COUNT; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${DOMAIN}`;

    try {
      const customer = await stripe.customers.create({
        email,
        name: `${firstName} ${lastName}`,
        description: `Generated customer ${i}/${CUSTOMER_COUNT}`,
      });

      console.log(`✓ Created customer ${i}/${CUSTOMER_COUNT}: ${customer.id} (${email})`);
    } catch (error) {
      console.error(`✗ Failed to create customer ${i}/${CUSTOMER_COUNT}:`, error);
      throw error;
    }
  }

  console.log(`\n✓ Successfully created ${CUSTOMER_COUNT} customers`);
}

generateCustomers().catch((e) => {
  console.error("Error generating customers:", e);
  process.exit(1);
});
