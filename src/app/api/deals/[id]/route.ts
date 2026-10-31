import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { api, HttpError, isAdmin, readJson } from "@/lib/api";
import { getDealOrThrow } from "@/lib/deals";
import { fmtDate, normPhone } from "@/lib/format";
import { dealPeople, firstName, notifyLater } from "@/lib/notify";
import { dealUpdate } from "@/lib/validators";

const { sponsorDeals } = schema;

export const PATCH = api<{ id: string }>(async ({ req, db, user, params }) => {
  const id = Number(params.id);
  const cur = await getDealOrThrow(db, user, id);
  const b = dealUpdate.parse(await readJson(req));
  const patch: Record<string, unknown> = { ...b, updatedAt: new Date() };
  if (b.contactPhone !== undefined) patch.contactPhone = normPhone(b.contactPhone);
  await db.update(sponsorDeals).set(patch).where(eq(sponsorDeals.id, id));
  const changed: string[] = [];
  if (b.nextAction && b.nextAction !== cur.nextAction) changed.push(`next step "${b.nextAction}"`);
  if (b.nextActionDue && b.nextActionDue !== cur.nextActionDue) changed.push(`due ${fmtDate(b.nextActionDue)}`);
  if (b.targetDate !== undefined && b.targetDate !== cur.targetDate) changed.push(b.targetDate ? `target ${fmtDate(b.targetDate)}` : "target removed");
  if (changed.length) {
    const [co] = await db.select({ name: schema.companies.name }).from(schema.companies).where(eq(schema.companies.id, cur.companyId)).limit(1);
    notifyLater(db, await dealPeople(db, cur), user.id, { title: co?.name ?? "Sponsor deal", body: `${firstName(user.name)} set ${changed.join(", ")}.`, url: "/home" });
  }
  return { ok: true };
});

export const DELETE = api<{ id: string }>(async ({ db, user, params }) => {
  const id = Number(params.id);
  const d = await getDealOrThrow(db, user, id);
  if (!isAdmin(user.role) && d.createdBy !== user.id) throw new HttpError(403, "Only an admin can delete someone else's deal");
  await db.delete(sponsorDeals).where(eq(sponsorDeals.id, id));
  return { ok: true };
});
