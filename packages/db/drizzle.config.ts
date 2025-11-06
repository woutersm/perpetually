import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema.server.ts",
  out: "./migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || "postgresql://perpetually:perpetually@localhost:5432/perpetually_dev",
  },
} satisfies Config;
