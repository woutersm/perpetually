import { getDb } from "./db/config.server";

// Ensure database migrations are run before tests
// Multiple test processes may run this simultaneously, so errors about
// existing objects are expected and safe to ignore
console.log("[vitest.setup] Initializing database...");

try {
  await getDb();
  console.log("[vitest.setup] Database ready");
} catch (error: any) {
  // Check if this is a duplicate/already exists error
  if (error.code === "23505" || error.code === "42P07" || error.message?.includes("already exists")) {
    console.log("[vitest.setup] Schema already initialized (expected for concurrent processes)");
  } else {
    console.error("[vitest.setup] Unexpected error:", error.message);
    throw error;
  }
}
