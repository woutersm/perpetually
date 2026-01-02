import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Netlify injects NETLIFY_DATABASE_URL for Neon
const isNetlify = !!process.env.NETLIFY_DATABASE_URL;

const databaseUrl =
  process.env.NETLIFY_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://perpetually:perpetually@localhost:5433/perpetually";

function createDb() {
  if (isNetlify) {
    // Use Neon HTTP driver for Netlify (serverless-optimized)
    return drizzleNeon(neon(databaseUrl), { schema });
  }
  // Use pg Pool for local development
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  return drizzlePg({ client: pool, schema });
}

export const db = createDb();
export default db;
