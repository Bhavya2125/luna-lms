import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { api, HttpError, isAdmin } from "@/lib/api";
import { buildHome } from "@/lib/home";

/** The signed-in person's Home data. Admins can pass ?as=<userId> to see a teammate's queue. */
export const GET = api(async ({ req, db, user }) => {
  const as = Number(req.nextUrl.searchParams.get("as") || 0);
  if (as && as !== user.id) {
    if (!isAdmin(user.role)) throw new HttpError(403, "You can only see your own work");
    const [t] = await db.select({ id: schema.users.id, name: schema.users.name, role: schema.users.role }).from(schema.users).where(eq(schema.users.id, as)).limit(1);
    if (!t) throw new HttpError(404, "User not found");
    return buildHome(db, user, t);
  }
  return buildHome(db, user, { id: user.id, name: user.name, role: user.role });
});
