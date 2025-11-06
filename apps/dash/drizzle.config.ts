import type { Config } from "drizzle-kit";
import baseConfig from "../../packages/db/drizzle.config";

// Update the output path to be relative to dash app
export default {
  ...baseConfig,
  schema: "../../packages/db/db/schema.server.ts",
  out: "../../packages/db/migrations",
} satisfies Config;
