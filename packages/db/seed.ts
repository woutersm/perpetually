import { faker } from "@faker-js/faker";
import { eq, getTableName } from "drizzle-orm";
import invariant from "tiny-invariant";
import dotenv from "dotenv";
import { getDb, nanoid } from "./db/config.server";
import {
  secretKeySchema,
  Team,
  teamSchema,
  userSchema,
} from "./db/schema.server";
import {
  createTeam,
  generateApiKey,
  generateSecretKey,
} from "./models/team.server";
import { createUser } from "./models/user.server";
import Stripe from "stripe";
import { execSync, spawn } from "child_process";
import { createProductsFromStripe } from "./models/product.server";
import { createLicensePolicy } from "./models/licensePolicy.server";
import { licenseTypeEnum } from "./types";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env.local
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

function getStripeConfig(apiKey: string) {
  try {
    const output = execSync("stripe config --list", {
      encoding: "utf-8",
      env: {
        ...process.env,
        STRIPE_API_KEY: apiKey,
      },
    });
    const config: Record<string, string> = {};

    output.split("\n").forEach((line) => {
      const [key, value] = line.split("=").map((s) => s.trim());
      if (key && value) {
        config[key] = value;
      }
    });

    return config;
  } catch (error) {
    console.error("Failed to get Stripe config:", error);
    return null;
  }
}

async function stripeLogin(apiKey: string) {
  try {
    console.log("Attempting Stripe CLI login...");
    const output = execSync("stripe login", {
      encoding: "utf-8",
      env: {
        ...process.env,
        STRIPE_API_KEY: apiKey,
      },
    });
    console.log("Stripe CLI login output:", output);
    return true;
  } catch (error) {
    console.error("Failed to login to Stripe CLI:", error);
    return false;
  }
}

function extractWebhookSecret(output: string): string | null {
  const match = output.match(/webhook signing secret is (whsec_[a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function startStripeWebhookListener(
  teamId: string,
  db: any,
  apiKey: string,
  dashPort: string
): Promise<{ secret: string; process: any }> {
  return new Promise((resolve) => {
    console.log(`Starting Stripe webhook listener for team ${teamId}...`);
    const stripeProcess = spawn("stripe", [
      "listen",
      "--forward-to",
      `http://localhost:${dashPort}/hooks/${teamId}`,
    ], {
      env: {
        ...process.env,
        STRIPE_API_KEY: apiKey,
      },
    });

    stripeProcess.stdout.on("data", async (data: Buffer) => {
      const output = data.toString("utf-8");
      console.log(`Stripe: ${output}`);
    });

    stripeProcess.stderr.on("data", async (data: Buffer) => {
      const output = data.toString("utf-8");
      console.log(`Stripe webhook output: ${output}`);

      const webhookSecret = extractWebhookSecret(output);

      if (webhookSecret) {
        console.log("Found webhook secret:", webhookSecret);
        await db
          .update(teamSchema)
          .set({ stripeWebhookSecret: webhookSecret })
          .where(eq(teamSchema.id, teamId))
          .execute();
        console.log("Updated team's webhook secret");
        resolve({ secret: webhookSecret, process: stripeProcess });
      }
    });

    stripeProcess.on("close", (code) => {
      console.log(`Stripe webhook listener process exited with code ${code}`);
    });
  });
}

async function createPaymentIntent(
  productId: string,
  customerId: string,
  apiKey: string
) {
  try {
    const command = [
      "stripe",
      "payment_intents",
      "create",
      "--amount=2000",
      "--currency=usd",
      `--customer=${customerId}`,
      "--payment-method=pm_card_visa",
      "--confirm=true",
      "-d",
      "automatic_payment_methods[enabled]=true",
      "-d",
      "automatic_payment_methods[allow_redirects]=never",
      "-d",
      `metadata[product_id]=${productId}`,
    ].join(" ");

    console.log(`Creating payment intent for product ${productId}...`);
    console.log("Payment intent created");

    // run the command with API key in environment
    execSync(command, {
      encoding: "utf-8",
      env: {
        ...process.env,
        STRIPE_API_KEY: apiKey,
      },
    });

    return true;
  } catch (error) {
    console.error(
      `Failed to create payment intent for product ${productId}:`,
      error
    );
    return false;
  }
}

function startDevServer(): Promise<{ process: any; port: string }> {
  console.log("Starting development server...");
  return new Promise((resolve) => {
    const devProcess = spawn("pnpm", ["run", "dev"], {
      cwd: path.resolve(__dirname, "../../apps/dash"),
    });

    let detectedPort: string | null = null;

    devProcess.stdout?.on("data", (data: Buffer) => {
      const output = data.toString("utf-8");
      console.log(`Dash: ${output}`);

      // Look for Vite's port output: "➜  Local:   http://localhost:5173/"
      if (!detectedPort) {
        const portMatch = output.match(/localhost:(\d+)/);
        if (portMatch) {
          detectedPort = portMatch[1];
          console.log(`Detected dev server running on port ${detectedPort}`);
          resolve({ process: devProcess, port: detectedPort });
        }
      }
    });

    devProcess.stderr?.on("data", (data: Buffer) => {
      const output = data.toString("utf-8");
      console.log(`Dash error: ${output}`);
    });

    devProcess.on("error", (error) => {
      console.error("Failed to start development server:", error);
    });
  });
}

async function getAllCustomerIds(stripe: Stripe): Promise<string[]> {
  const customers: string[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.customers.list({
      limit: 100,
      starting_after: startingAfter,
    });

    customers.push(...response.data.map((customer) => customer.id));

    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = response.data[response.data.length - 1].id;
    }
  }

  return customers;
}

async function seed() {
  const stripeApiKey = process.env.SEED_STRIPE_API_KEY;
  invariant(
    stripeApiKey,
    "SEED_STRIPE_API_KEY environment variable is required"
  );
  const stripeWebhookSecret =
    "fake_value_should_be_replaced_by_listener_value_further_downstream_in_the_seed";

  const stripe = new Stripe(stripeApiKey, {
    apiVersion: "2025-10-29.clover",
  });
  const db = await getDb();

  console.log("Starting seed process...");

  const config = getStripeConfig(stripeApiKey);
  console.log("Current Stripe config:", config);

  // Only login if not logged in
  if (!config || !Object.values(config).includes("'letsgo'")) {
    console.log("Project name is not 'letsgo', attempting login...");
    const stripeLoggedIn = await stripeLogin(stripeApiKey);
    if (!stripeLoggedIn) {
      console.error("Failed to login to Stripe CLI. Exiting seed process.");
      return;
    }
  } else {
    console.log("Already logged in with project name 'letsgo'");
  }

  const secretKey = generateSecretKey();
  const apiKey = generateApiKey();

  const team = (
    await db
      .insert(teamSchema)
      .values({
        id: "tea_ig3f1avg0o3f",
        name: "letsgo",
        apiKey,
        slug: "letsgo",
      })
      .returning()
      .execute()
  )[0];

  await db
    .insert(secretKeySchema)
    .values({
      id: nanoid(getTableName(secretKeySchema)),
      secretKey,
      teamId: team.id,
    })
    .execute();

  await db
    .update(teamSchema)
    .set({
      stripeApiKey,
      stripeWebhookSecret,
      isOnboarded: 1,
    })
    .where(eq(teamSchema.id, team.id))
    .execute();

  await createUser({
    email: "martijn@wouters.dev",
    password: "frieseschouwAssen",
    teamId: team.id,
    name: "Martijn",
  });

  let user = await db.query.userSchema.findFirst({
    where: eq(userSchema.email, "martijn@wouters.dev"),
    with: {
      team: {
        with: {
          products: true,
        },
      },
    },
  });

  await createProductsFromStripe(user?.team as Team);

  // Start the development server first to detect its port
  console.log("Starting development server...");
  const { process: devProcess, port: detectedPort } = await startDevServer();
  console.log(`Development server started on port ${detectedPort}`);

  // Start the listener with the detected port
  console.log("Starting Stripe webhook listener...");
  const { secret: webhookSecret, process: stripeProcess } =
    await startStripeWebhookListener(team.id, db, stripeApiKey, detectedPort);
  console.log(`Successfully obtained webhook secret: ${webhookSecret}`);

  console.log("Sleeping for 5 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log("Done sleeping.");

  process.on("SIGINT", () => {
    console.log("Terminating processes...");
    devProcess.kill();
    stripeProcess.kill();
    process.exit();
  });

  user = await db.query.userSchema.findFirst({
    where: eq(userSchema.email, "martijn@wouters.dev"),
    with: {
      team: {
        with: {
          products: true,
        },
      },
    },
  });

  console.log("Fetching all customer IDs from Stripe...");
  const customerIds = await getAllCustomerIds(stripe);
  console.log(`Found ${customerIds.length} customers`);

  // Create a shuffled distribution of payment intent counts
  // 70% get 1, 20% get 2, 10% get 3
  function createShuffledIntentDistribution(
    totalCustomers: number
  ): number[] {
    const distribution: number[] = [];

    // Calculate counts based on percentages
    const count1 = Math.floor(totalCustomers * 0.7); // 70%
    const count2 = Math.floor(totalCustomers * 0.2); // 20%
    const count3 = totalCustomers - count1 - count2; // 10% (remainder)

    // Create array with the distribution
    for (let i = 0; i < count1; i++) distribution.push(1);
    for (let i = 0; i < count2; i++) distribution.push(2);
    for (let i = 0; i < count3; i++) distribution.push(3);

    // Fisher-Yates shuffle to randomize
    for (let i = distribution.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [distribution[i], distribution[j]] = [distribution[j], distribution[i]];
    }

    return distribution;
  }

  const intentDistribution = createShuffledIntentDistribution(customerIds.length);

  for (const product of user?.team?.products ?? []) {
    await createLicensePolicy({
      productId: product.id,
      type: licenseTypeEnum.restrict,
      activationLimit: 1,
      licenseLength: 365,
    });

    // Create payment intents for each product based on shuffled distribution
    if (product.stripeProductId) {
      for (let i = 0; i < customerIds.length; i++) {
        const customerId = customerIds[i];
        const intentCount = intentDistribution[i];

        console.log(
          `Creating ${intentCount} payment intent(s) for customer ${i + 1}/${customerIds.length}`
        );

        for (let j = 0; j < intentCount; j++) {
          await createPaymentIntent(
            product.stripeProductId,
            customerId,
            stripeApiKey
          );
        }
      }
    } else {
      console.warn(
        `Skipping payment intent creation for product ${product.id} - no Stripe product ID`
      );
    }
  }

  // Keep the process running to handle webhooks
  console.log("Seed process completed. Press Ctrl+C to exit.");
  await new Promise(() => {});
}

seed().catch((e) => console.error(e));
