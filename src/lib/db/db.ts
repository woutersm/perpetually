import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// DATABASE_URL accepts a local file ("sqlite.db" or "file:sqlite.db") or a
// remote libSQL URL (e.g. Turso: "libsql://<db>.turso.io" + DATABASE_AUTH_TOKEN)
function resolveUrl(url = process.env.DATABASE_URL || "sqlite.db") {
  return /^(file|libsql|https?|wss?):/.test(url) ? url : `file:${url}`;
}

// Pass schema to drizzle for relational query support
// The schema includes both tables and relations defined with defineRelations
export const db = drizzle({
  connection: {
    url: resolveUrl(),
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
  schema,
});

export default db;
