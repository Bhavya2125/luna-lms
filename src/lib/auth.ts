import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Role } from "./stages";

const COOKIE = "lw_session";
const DAYS = 30;

export type SessionUser = { id: number; name: string; username: string; role: Role };

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function createSession(userId: number) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DAYS * 864e5);
  await db.insert(schema.sessions).values({ id: sha(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sha(token)));
  }
  jar.delete(COOKIE);
}

/** Loads the signed-in user from the cookie. Revoked accounts and expired sessions return null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: schema.users.id, name: schema.users.name, username: schema.users.username, role: schema.users.role, active: schema.users.active })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || !row.active) return null;
  return { id: row.id, name: row.name, username: row.username, role: row.role };
}

export async function revokeUserSessions(userId: number) {
  const db = await getDb();
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

/* Simple in-memory throttle: 8 failed sign-ins per username+IP in 15 minutes.
   On serverless this is per instance; put a shared limiter (e.g. Upstash) in front for stricter limits. */
const fails = new Map<string, { n: number; t: number }>();
export function loginThrottled(key: string) {
  const f = fails.get(key);
  return !!f && Date.now() - f.t < 15 * 60_000 && f.n >= 8;
}
export function loginFailed(key: string) {
  const f = fails.get(key);
  if (!f || Date.now() - f.t > 15 * 60_000) fails.set(key, { n: 1, t: Date.now() });
  else f.n++;
}
export function loginOk(key: string) {
  fails.delete(key);
}
