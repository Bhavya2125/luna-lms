import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { api, HttpError, readJson } from "@/lib/api";
import { getDealOrThrow } from "@/lib/deals";
import { normPhone } from "@/lib/format";
import { checkDealMove } from "@/lib/rules";
import { dealMove } from "@/lib/validators";

const { sponsorDeals, sponsorDealLog } = schema;

export const POST = api<{ id: string }>(async ({ req, db, user, params }) => {
  const id = Number(params.id);
  const cur = await getDealOrThrow(db, user, id);
  const b = dealMove.parse(await readJson(req));
  const merged = { ...cur, ...(b.fields ?? {}) };
  const err = checkDealMove(user.role, cur.stage, b.to, merged, b.reason);
  if (err) throw new HttpError(400, err);
  const patch: Record<string, unknown> = {
    ...(b.fields ?? {}),
    stage: b.to,
    lostReason: b.to === "lost" ? b.reason!.trim() : "",
    updatedAt: new Date(),
  };
  if (b.fields?.contactPhone !== undefined) patch.contactPhone = normPhone(b.fields.contactPhone);
  await db.transaction(async (tx) => {
    await tx.update(sponsorDeals).set(patch).where(eq(sponsorDeals.id, id));
    await tx.insert(sponsorDealLog).values({ dealId: id, fromStage: cur.stage, toStage: b.to, reason: b.reason ?? "", byUserId: user.id });
  });
  return { ok: true };
});
