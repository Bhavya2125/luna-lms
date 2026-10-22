import "server-only";
import { and, eq, exists, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { schema, type Db } from "@/db";
import { HttpError, isAdmin } from "./api";
import type { SessionUser } from "./auth";

const { colleges, collegeAssignments, users } = schema;

/** SQL filter that limits executives to their assigned colleges; admins see everything. */
export function collegeScope(user: SessionUser): SQL | undefined {
  if (isAdmin(user.role)) return undefined;
  return exists(
    sqlSelectAssigned(user.id),
  );
}
function sqlSelectAssigned(userId: number) {
  // correlated sub-select used by exists()
  return sql`(select 1 from ${collegeAssignments} where ${collegeAssignments.collegeId} = ${colleges.id} and ${collegeAssignments.userId} = ${userId})`;
}

export async function assignedCollegeIds(db: Db, userId: number): Promise<number[]> {
  const rows = await db.select({ id: collegeAssignments.collegeId }).from(collegeAssignments).where(eq(collegeAssignments.userId, userId));
  return rows.map((r) => r.id);
}

export async function getCollegeOrThrow(db: Db, user: SessionUser, id: number) {
  const [c] = await db.select().from(colleges).where(eq(colleges.id, id)).limit(1);
  if (!c) throw new HttpError(404, "College not found");
  if (!isAdmin(user.role)) {
    const ids = await assignedCollegeIds(db, user.id);
    if (!ids.includes(id)) throw new HttpError(403, "This college isn't assigned to you");
  }
  return c;
}

export async function assigneesFor(db: Db, collegeIds: number[]) {
  if (!collegeIds.length) return new Map<number, { id: number; name: string }[]>();
  const rows = await db
    .select({ collegeId: collegeAssignments.collegeId, id: users.id, name: users.name })
    .from(collegeAssignments)
    .innerJoin(users, eq(users.id, collegeAssignments.userId))
    .where(inArray(collegeAssignments.collegeId, collegeIds));
  const m = new Map<number, { id: number; name: string }[]>();
  for (const r of rows) m.set(r.collegeId, [...(m.get(r.collegeId) ?? []), { id: r.id, name: r.name }]);
  return m;
}

/** Fest year for a month: this year if the month hasn't passed, otherwise next year. */
export function nextFestYear(month: number, now = new Date()) {
  return month >= now.getMonth() ? now.getFullYear() : now.getFullYear() + 1;
}

/** Executives see deals on their colleges, plus overall deals they started themselves. */
export function dealScope(user: SessionUser, assigned: number[]): SQL | undefined {
  if (isAdmin(user.role)) return undefined;
  const own = and(isNull(schema.sponsorDeals.collegeId), eq(schema.sponsorDeals.createdBy, user.id));
  return assigned.length ? or(inArray(schema.sponsorDeals.collegeId, assigned), own) : own;
}

export { and, eq };
