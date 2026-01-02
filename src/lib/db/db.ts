import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl =
  process.env.NETLIFY_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://perpetually:perpetually@localhost:5433/perpetually";

// Netlify uses Neon (serverless), local uses pg
const isNetlify = !!process.env.NETLIFY_DATABASE_URL;

// Create the appropriate db instance
const db = isNetlify
  ? drizzleNeon(databaseUrl, { schema })
  : drizzlePg({
      client: new Pool({
        connectionString: databaseUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }),
      schema,
    });

export { db };
export default db;
