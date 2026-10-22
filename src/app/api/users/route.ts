import { asc, sql } from "drizzle-orm";
import { schema } from "@/db";
import { api, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { userCreate } from "@/lib/validators";

const { users, collegeAssignments, auditLog } = schema;

/** Team list. Admins can see it; only Super Admins can change it. Executives get a name-only list (needed for assignee pickers is admin-only, so they get 403). */
export const GET = api(
  async ({ db }) => {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        role: users.role,
        active: users.active,
        createdAt: users.createdAt,
        colleges: sql<number>`(select count(*)::int from ${collegeAssignments} where ${collegeAssignments.userId} = ${users.id})`,
      })
      .from(users)
      .orderBy(asc(users.name));
    return rows;
  },
  { roles: ["admin", "super_admin"] },
);

export const POST = api(
  async ({ req, db, user }) => {
    const b = userCreate.parse(await readJson(req));
    const [row] = await db
      .insert(users)
      .values({ name: b.name, username: b.username.toLowerCase(), passwordHash: await hashPassword(b.password), role: b.role })
      .returning({ id: users.id });
    await db.insert(auditLog).values({ actorId: user.id, action: "user.create", targetUserId: row.id, detail: { role: b.role } });
    return { id: row.id };
  },
  { roles: ["super_admin"] },
);
