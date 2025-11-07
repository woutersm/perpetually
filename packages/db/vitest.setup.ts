import { getDb } from "./db/config.server";

// Reset database before tests (drop and recreate test database)
// This ensures a clean slate for each test run
try {
  const postgres = await import("postgres");
  // Connect to dev database to manage test database
  const client = postgres.default(
    "postgresql://perpetually:perpetually@localhost:5432/perpetually_dev"
  );

  // Drop test database if it exists (with FORCE to disconnect active connections)
  try {
    await client`DROP DATABASE IF EXISTS perpetually_test WITH (FORCE)`;
  } catch {
    // Ignore if drop fails
  }

  // Create fresh test database
  try {
    await client`CREATE DATABASE perpetually_test`;
  } catch {
    // Ignore if create fails (might already exist)
  }

  await client.end();
} catch (error) {
  console.warn("Could not reset test database:", error);
}

// Initialize database and run migrations before any tests
await getDb();
