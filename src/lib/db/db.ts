import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Pass schema to drizzle for relational query support
// The schema includes both tables and relations defined with defineRelations
export const db = drizzle({
  connection: "file:sqlite.db",
  schema,
});

export default db;
