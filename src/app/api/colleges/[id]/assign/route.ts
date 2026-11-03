import { eq, inArray } from "drizzle-orm";
import { schema } from "@/db";
import { api, readJson } from "@/lib/api";
import { festWhen, fmtDate } from "@/lib/format";
import { firstName, notifyLater } from "@/lib/notify";
import { assignSchema } from "@/lib/validators";

const { collegeAssignments, colleges, users } = schema;

/** Sets who works on a college and, optionally, the company name we pitch under. */
export const POST = api<{ id: string }>(
  async ({ req, db, user, params }) => {
    const id = Number(params.id);
    const { userIds, pitchCompany } = assignSchema.parse(await readJson(req));
    const valid = userIds.length ? await db.select({ id: users.id }).from(users).where(inArray(users.id, userIds)) : [];
    const before = new Set((await db.select({ id: collegeAssignments.userId }).from(collegeAssignments).where(eq(collegeAssignments.collegeId, id))).map((r) => r.id));
    await db.transaction(async (tx) => {
      await tx.delete(collegeAssignments).where(eq(collegeAssignments.collegeId, id));
      if (valid.length) await tx.insert(collegeAssignments).values(valid.map((u) => ({ collegeId: id, userId: u.id })));
      if (pitchCompany !== undefined) await tx.update(colleges).set({ pitchCompany, updatedAt: new Date() }).where(eq(colleges.id, id));
    });
    const added = valid.map((u) => u.id).filter((u) => !before.has(u));
    if (added.length) {
      const [c] = await db.select().from(colleges).where(eq(colleges.id, id)).limit(1);
      const when = c.festStart ? `fest ${fmtDate(c.festStart)}` : c.festMonth == null ? "fest month not set yet" : `fest ${festWhen(c)}`;
      notifyLater(db, added, user.id, { title: `New college: ${c.name}`, body: `${firstName(user.name)} assigned you ${c.name}${c.festName ? ` (${c.festName})` : ""}, ${when}.`, url: `/colleges?open=${id}` });
    }
    return { ok: true };
  },
  { roles: ["admin", "super_admin"] },
);
