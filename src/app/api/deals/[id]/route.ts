import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { api, HttpError, isAdmin, readJson } from "@/lib/api";
import { getDealOrThrow } from "@/lib/deals";
import { normPhone } from "@/lib/format";
import { dealUpdate } from "@/lib/validators";

const { sponsorDeals } = schema;

export const PATCH = api<{ id: string }>(async ({ req, db, user, params }) => {
  const id = Number(params.id);
  await getDealOrThrow(db, user, id);
  const b = dealUpdate.parse(await readJson(req));
  const patch: Record<string, unknown> = { ...b, updatedAt: new Date() };
  if (b.contactPhone !== undefined) patch.contactPhone = normPhone(b.contactPhone);
  await db.update(sponsorDeals).set(patch).where(eq(sponsorDeals.id, id));
  return { ok: true };
});

export const DELETE = api<{ id: string }>(async ({ db, user, params }) => {
  const id = Number(params.id);
  const d = await getDealOrThrow(db, user, id);
  if (!isAdmin(user.role) && d.createdBy !== user.id) throw new HttpError(403, "Only an admin can delete someone else's deal");
  await db.delete(sponsorDeals).where(eq(sponsorDeals.id, id));
  return { ok: true };
});
