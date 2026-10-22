import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { api, HttpError, readJson } from "@/lib/api";
import { createSession, loginFailed, loginOk, loginThrottled, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";

// Compared when the username is unknown so response time doesn't reveal which usernames exist.
const DUMMY = bcrypt.hashSync("lunawave-timing-guard", 10);

export const POST = api(
  async ({ req, db }) => {
    const { username, password } = loginSchema.parse(await readJson(req));
    const key = `${username.toLowerCase()}|${req.headers.get("x-forwarded-for") ?? "local"}`;
    if (loginThrottled(key)) throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
    const [u] = await db.select().from(schema.users).where(eq(schema.users.username, username.toLowerCase())).limit(1);
    const ok = await verifyPassword(password, u?.passwordHash ?? DUMMY);
    if (!u || !ok) {
      loginFailed(key);
      throw new HttpError(401, "Wrong username or password");
    }
    if (!u.active) throw new HttpError(403, "This account’s access has been revoked. Ask a Super Admin.");
    loginOk(key);
    await createSession(u.id);
    return { id: u.id, name: u.name, username: u.username, role: u.role };
  },
  { public: true },
);
