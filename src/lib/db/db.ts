import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://perpetually:perpetually@localhost:5433/perpetually",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Pass schema to drizzle for relational query support
export const db = drizzle({ client: pool, schema });

export default db;
