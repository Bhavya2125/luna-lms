import path from "node:path";
import bcrypt from "bcryptjs";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Production / preview: set DATABASE_URL to any Postgres (Neon, Supabase, RDS…).
 * Local development without DATABASE_URL: an embedded Postgres (PGlite) is stored in .data/pglite.
 * Both speak the same SQL, so the schema and queries are identical.
 */
export type Db = NodePgDatabase<typeof schema>;

const g = globalThis as unknown as { __lwDb?: Promise<Db> };
const migrationsFolder = () => path.join(process.cwd(), "drizzle");

async function create(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  let db: Db;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 5) });
    db = drizzlePg(pool, { schema });
    if (process.env.AUTO_MIGRATE === "1") {
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      await migrate(db, { migrationsFolder: migrationsFolder() });
    }
  } else {
    if (process.env.NODE_ENV === "production" && process.env.USE_EMBEDDED_DB !== "1") {
      throw new Error("DATABASE_URL is required in production");
    }
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const client = new PGlite(path.join(process.cwd(), ".data", "pglite"));
    const local = drizzle(client, { schema });
    await migrate(local, { migrationsFolder: migrationsFolder() });
    db = local as unknown as Db;
  }
  await bootstrapAdmin(db);
  return db;
}

/**
 * First run on an empty database: creates a Super Admin from BOOTSTRAP_ADMIN_USERNAME / BOOTSTRAP_ADMIN_PASSWORD.
 * Does nothing once any account exists, so it is safe to leave set; remove the password from the environment after first sign-in.
 */
async function bootstrapAdmin(db: Db) {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!username || !password) return;
  if (password.length < 8) {
    console.warn("BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters; no account created");
    return;
  }
  const any = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
  if (any.length) return;
  await db
    .insert(schema.users)
    .values({ username, name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || username, passwordHash: await bcrypt.hash(password, 10), role: "super_admin" })
    .onConflictDoNothing();
  console.log(`Created the first Super Admin: ${username}`);
}

export function getDb(): Promise<Db> {
  if (!g.__lwDb) {
    // a failed connection is not cached, so the next request retries
    g.__lwDb = create().catch((e) => {
      g.__lwDb = undefined;
      throw e;
    });
  }
  return g.__lwDb;
}

export { schema };
