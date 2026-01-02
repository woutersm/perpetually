import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Netlify injects NETLIFY_DATABASE_URL, fall back to DATABASE_URL for other environments
const databaseUrl =
  process.env.NETLIFY_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://perpetually:perpetually@localhost:5433/perpetually";

const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Pass schema to drizzle for relational query support
export const db = drizzle({ client: pool, schema });

export default db;
