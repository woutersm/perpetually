import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env.local
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = postgres(DATABASE_URL);

async function dropAllTables() {
  try {
    console.log("Dropping all tables from the database...");

    // Get all table names
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `;

    if (tables.length === 0) {
      console.log("No tables found to drop.");
      return;
    }

    // Drop all tables with CASCADE to handle foreign keys
    for (const table of tables) {
      console.log(`Dropping table: ${table.tablename}`);
      await sql.unsafe(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`);
    }

    console.log("✓ All tables dropped successfully");
  } catch (error) {
    console.error("Error dropping tables:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

dropAllTables();
