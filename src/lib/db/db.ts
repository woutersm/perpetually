import * as schema from "./schema";

const databaseUrl =
  process.env.NETLIFY_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://perpetually:perpetually@localhost:5433/perpetually";

// Netlify uses Neon (serverless), local uses pg
const isNetlify = !!process.env.NETLIFY_DATABASE_URL;

let db: any;

if (isNetlify) {
  // Neon HTTP driver - just pass the connection string directly
  const { drizzle } = await import("drizzle-orm/neon-http");
  db = drizzle(databaseUrl, { schema });
} else {
  // pg driver for local development
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  db = drizzle({ client: pool, schema });
}

export { db };
export default db;
