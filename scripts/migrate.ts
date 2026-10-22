/**
 * Applies SQL migrations from ./drizzle. Uses DIRECT_DATABASE_URL when set (Neon: the non-pooled connection,
 * recommended for schema changes), otherwise DATABASE_URL.
 */
import { loadEnvConfig } from "@next/env";
import path from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

loadEnvConfig(process.cwd()); // read .env.local like the app does

async function main() {
  const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (or DIRECT_DATABASE_URL)");
  const pool = new Pool({ connectionString: url, max: 1 });
  await migrate(drizzle(pool), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await pool.end();
  console.log("Migrations applied.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
