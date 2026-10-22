import { eq, inArray } from "drizzle-orm";
import { schema } from "@/db";
import { api, readJson } from "@/lib/api";
import { assignSchema } from "@/lib/validators";

const { collegeAssignments, colleges, users } = schema;

/** Sets who works on a college and, optionally, the company name we pitch under. */
export const POST = api<{ id: string }>(
  async ({ req, db, params }) => {
    const id = Number(params.id);
    const { userIds, pitchCompany } = assignSchema.parse(await readJson(req));
    const valid = userIds.length ? await db.select({ id: users.id }).from(users).where(inArray(users.id, userIds)) : [];
    await db.transaction(async (tx) => {
      await tx.delete(collegeAssignments).where(eq(collegeAssignments.collegeId, id));
      if (valid.length) await tx.insert(collegeAssignments).values(valid.map((u) => ({ collegeId: id, userId: u.id })));
      if (pitchCompany !== undefined) await tx.update(colleges).set({ pitchCompany, updatedAt: new Date() }).where(eq(colleges.id, id));
    });
    return { ok: true };
  },
  { roles: ["admin", "super_admin"] },
);
