import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@/db";
import { api, HttpError, readJson } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";

const { users, sessions } = schema;

/** Change your own password. Other devices are signed out. */
export const POST = api(async ({ req, db, user }) => {
  const b = z.object({ current: z.string().min(1), next: z.string().min(8, "At least 8 characters").max(200) }).parse(await readJson(req));
  const [u] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!(await verifyPassword(b.current, u.passwordHash))) throw new HttpError(400, "Your current password is wrong");
  await db.update(users).set({ passwordHash: await hashPassword(b.next), updatedAt: new Date() }).where(eq(users.id, user.id));
  const token = (await cookies()).get("lw_session")?.value;
  if (token) await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.id, createHash("sha256").update(token).digest("hex"))));
  return { ok: true };
});
