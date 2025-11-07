import { getDb } from "./db/config.server";

// Reset database before tests (drop and recreate test database)
// This ensures a clean slate for each test run
try {
  const postgres = await import("postgres");
  // Connect to dev database to manage test database
  const client = postgres.default(
    "postgresql://perpetually:perpetually@localhost:5432/perpetually_dev",
    { idle_timeout: 1 }
  );

  // Wait a bit for any existing connections to close
  await new Promise(resolve => setTimeout(resolve, 500));

  // Drop test database if it exists (with FORCE to disconnect active connections)
  try {
    await client`DROP DATABASE IF EXISTS perpetually_test WITH (FORCE)`;
  } catch (error) {
    console.warn("Could not drop test database:", error);
  }

  // Create fresh test database
  try {
    await client`CREATE DATABASE perpetually_test`;
  } catch (error) {
    console.warn("Could not create test database:", error);
  }

  await client.end();
} catch (error) {
  console.warn("Could not reset test database:", error);
}

// Initialize database and run migrations before any tests
await getDb();
