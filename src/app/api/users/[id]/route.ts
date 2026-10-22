import { and, eq, ne } from "drizzle-orm";
import { schema } from "@/db";
import { api, HttpError, readJson } from "@/lib/api";
import { hashPassword, revokeUserSessions } from "@/lib/auth";
import { userUpdate } from "@/lib/validators";

const { users, auditLog } = schema;

export const PATCH = api<{ id: string }>(
  async ({ req, db, user, params }) => {
    const id = Number(params.id);
    const b = userUpdate.parse(await readJson(req));
    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) throw new HttpError(404, "User not found");

    const nextRole = b.role ?? target.role;
    const nextActive = b.active ?? target.active;
    if (id === user.id && (b.role && b.role !== target.role)) throw new HttpError(400, "You can't change your own role");
    if (id === user.id && b.active === false) throw new HttpError(400, "You can't revoke your own access");
    // keep at least one active Super Admin
    if (target.role === "super_admin" && (nextRole !== "super_admin" || !nextActive)) {
      const others = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "super_admin"), eq(users.active, true), ne(users.id, id)));
      if (!others.length) throw new HttpError(400, "Keep at least one active Super Admin");
    }

    const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (b.name !== undefined) patch.name = b.name;
    if (b.username !== undefined) patch.username = b.username.toLowerCase();
    if (b.role !== undefined) patch.role = b.role;
    if (b.active !== undefined) patch.active = b.active;
    if (b.password) patch.passwordHash = await hashPassword(b.password);
    await db.update(users).set(patch).where(eq(users.id, id));

    // role change, password reset and revoke all end the person's existing sessions
    if (b.password || b.active === false || (b.role && b.role !== target.role)) await revokeUserSessions(id);

    const action = b.active === false ? "user.revoke" : b.active === true && !target.active ? "user.restore" : b.password ? "user.password_reset" : "user.update";
    await db.insert(auditLog).values({ actorId: user.id, action, targetUserId: id, detail: { role: nextRole } });
    return { ok: true };
  },
  { roles: ["super_admin"] },
);
