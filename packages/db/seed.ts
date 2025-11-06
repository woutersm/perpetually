import { faker } from "@faker-js/faker";
import { eq, getTableName } from "drizzle-orm";
import invariant from "tiny-invariant";
import { db, nanoid } from "./db/config.server";
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

function getStripeConfig() {
  try {
    const output = execSync("stripe config --list", { encoding: "utf-8" });
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

async function stripeLogin() {
  try {
    console.log("Attempting Stripe CLI login...");
    const output = execSync("stripe login", { encoding: "utf-8" });
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

function startStripeWebhookListener(teamId: string): Promise<string> {
  return new Promise((resolve) => {
    console.log(`Starting Stripe webhook listener for team ${teamId}...`);
    const stripeProcess = spawn("stripe", [
      "listen",
      "--forward-to",
      `http://localhost:3000/hooks/${teamId}`,
    ]);

    stripeProcess.stdout.on("data", async (data: Buffer) => {});

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
        resolve(webhookSecret);
      }
    });

    stripeProcess.on("close", (code) => {
      console.log(`Stripe webhook listener process exited with code ${code}`);
    });
  });
}

async function createPaymentIntent(productId: string, customerId: string) {
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

    // run the command
    execSync(command, { encoding: "utf-8" });

    return true;
  } catch (error) {
    console.error(
      `Failed to create payment intent for product ${productId}:`,
      error
    );
    return false;
  }
}

function startDevServer() {
  console.log("Starting development server...");
  const devProcess = spawn("npm", ["run", "dev"], {
    cwd: path.resolve(__dirname, "../apps/dash"),
    stdio: "inherit",
  });

  devProcess.on("error", (error) => {
    console.error("Failed to start development server:", error);
  });

  return devProcess;
}

async function seed() {
  const stripeApiKey =
    "rk_test_REDACTED";
  const stripeWebhookSecret = "whsec_REDACTED";

  console.log("Starting seed process...");

  const config = getStripeConfig();
  console.log("Current Stripe config:", config);

  // Only login if not logged in
  if (!config || !Object.values(config).includes("'letsgo'")) {
    console.log("Project name is not 'letsgo', attempting login...");
    const stripeLoggedIn = await stripeLogin();
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
  await startStripeWebhookListener(user?.team?.id as string);

  // Start the development server
  const devProcess = startDevServer();

  console.log("Sleeping for 5 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log("Done sleeping.");

  process.on("SIGINT", () => {
    console.log("Terminating processes...");
    devProcess.kill();
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

  const customerId = "cus_SS9MDPlWNKIfFj";

  for (const product of user?.team?.products ?? []) {
    await createLicensePolicy({
      productId: product.id,
      type: licenseTypeEnum.restrict,
      activationLimit: 1,
      licenseLength: 365,
    });

    // Create a payment intent for each product
    if (product.stripeProductId) {
      for (let i = 0; i < 40; i++) {
        await createPaymentIntent(product.stripeProductId, customerId);
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
