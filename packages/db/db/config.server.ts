import { customAlphabet } from "nanoid";
import * as schema from "./schema.server";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsFolder = path.join(__dirname + "/../migrations");

let db: any;
let initPromise: Promise<void> | null = null;

async function initializeDb() {
  // Use PostgreSQL for everything (tests, dev, prod)
  // For tests, use a separate test database that gets cleared between test runs
  const postgresModule = await import("postgres");
  const postgres = postgresModule.default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");

  const isTest = process.env.NODE_ENV === "test";
  const connectionString = isTest
    ? process.env.DATABASE_TEST_URL || "postgresql://perpetually:perpetually@localhost:5432/perpetually_test"
    : process.env.DATABASE_URL || "postgresql://perpetually:perpetually@localhost:5432/perpetually_dev";

  // Suppress PostgreSQL NOTICE messages (e.g., migration schema already exists)
  const client = postgres(connectionString, {
    onnotice: () => {}, // Suppress NOTICE messages from migrations
  });
  db = drizzle(client, {
    schema,
    logger: false,
  });

  // Run migrations
  await migrate(db, { migrationsFolder });
}

// Initialize on module load in Node.js (server), but not in browser
if (typeof globalThis !== "undefined" && typeof (globalThis as any).window === "undefined") {
  initPromise = initializeDb();
}

export async function getDb() {
  if (initPromise) {
    await initPromise;
  }
  return db;
}

// Export db - will be set after initialization
export { db };

export function nanoid(table: string) {
  const prefix = table.slice(0, 3);
  const id = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12)();

  return prefix + "_" + id;
}
