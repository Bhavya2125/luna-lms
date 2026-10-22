import "server-only";
import { eq } from "drizzle-orm";
import { schema, type Db } from "@/db";
import { HttpError, isAdmin } from "./api";
import type { SessionUser } from "./auth";
import { assignedCollegeIds } from "./queries";

export async function getDealOrThrow(db: Db, user: SessionUser, id: number) {
  const [d] = await db.select().from(schema.sponsorDeals).where(eq(schema.sponsorDeals.id, id)).limit(1);
  if (!d) throw new HttpError(404, "Deal not found");
  if (!isAdmin(user.role)) {
    const ok = d.collegeId ? (await assignedCollegeIds(db, user.id)).includes(d.collegeId) : d.createdBy === user.id;
    if (!ok) throw new HttpError(403, "This deal isn't yours");
  }
  return d;
}
