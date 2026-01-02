import { defineConfig } from "drizzle-kit";

// Netlify injects NETLIFY_DATABASE_URL, fall back to DATABASE_URL for other environments
const databaseUrl =
  process.env.NETLIFY_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://perpetually:perpetually@localhost:5433/perpetually";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
