/**
 * Creates the first Super Admin (or resets that account's password):
 *   ADMIN_USERNAME=you ADMIN_NAME="Your Name" ADMIN_PASSWORD='at least 8 chars' npm run create-admin
 */
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/db/connect";

loadEnvConfig(process.cwd()); // read .env.local like the app does

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim() || username;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !name || !password || password.length < 8) {
    throw new Error("Set ADMIN_USERNAME, ADMIN_NAME and ADMIN_PASSWORD (8+ characters)");
  }
  const db = await getDb();
  const passwordHash = await bcrypt.hash(password, 10);
  const [u] = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
  if (u) {
    await db.update(schema.users).set({ passwordHash, role: "super_admin", active: true, name }).where(eq(schema.users.id, u.id));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, u.id));
    console.log(`Updated ${username} as Super Admin.`);
  } else {
    await db.insert(schema.users).values({ username, name, passwordHash, role: "super_admin" });
    console.log(`Created Super Admin ${username}.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  });
