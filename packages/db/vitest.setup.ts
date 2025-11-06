import { getDb } from "./db/config.server";

// Initialize database and run migrations before any tests
await getDb();
