import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { api, HttpError, readJson } from "@/lib/api";
import { getCollegeOrThrow } from "@/lib/queries";
import { isClosed } from "@/lib/priority";
import { inr } from "@/lib/format";
import { adminIds, collegePeople, firstName, notifyLater } from "@/lib/notify";
import { STAGE_LABEL } from "@/lib/stages";
import { checkCollegeMove } from "@/lib/rules";
import { stageMove } from "@/lib/validators";

const { colleges, collegeStageLog } = schema;

export const POST = api<{ id: string }>(async ({ req, db, user, params }) => {
  const id = Number(params.id);
  const cur = await getCollegeOrThrow(db, user, id);
  const b = stageMove.parse(await readJson(req));
  const merged = { ...cur, ...(b.fields ?? {}) };
  const err = checkCollegeMove(user.role, cur.stage, b.to, merged, b.reason);
  if (err) throw new HttpError(400, err);
  const now = new Date();
  const patch: Record<string, unknown> = { ...(b.fields ?? {}), stage: b.to, lostReason: b.to === "lost" ? b.reason!.trim() : "", updatedAt: now, lastTouchedAt: now, stageEnteredAt: now };
  // stages never set dates; a closed deal simply has no next step any more
  if (isClosed(b.to)) Object.assign(patch, { nextAction: "", nextActionDue: null });
  if (b.fields?.festStart) {
    patch.festMonth = Number(b.fields.festStart.slice(5, 7)) - 1;
    patch.festYear = Number(b.fields.festStart.slice(0, 4));
  }
  await db.transaction(async (tx) => {
    await tx.update(colleges).set(patch).where(eq(colleges.id, id));
    await tx.insert(collegeStageLog).values({ collegeId: id, fromStage: cur.stage, toStage: b.to, reason: b.reason ?? "", byUserId: user.id });
  });
  const people = await collegePeople(db, id);
  const who = firstName(user.name);
  const url = `/colleges?open=${id}`;
  if (b.to === "locked") {
    const amount = (b.fields?.dealAmount ?? cur.dealAmount) || 0;
    notifyLater(db, [...people, ...(await adminIds(db))], user.id, { title: `Locked: ${cur.name}`, body: `${who} locked ${cur.name}${amount ? ` for ${inr(amount)}` : ""}.`, url });
  } else if (b.to === "lost") {
    notifyLater(db, [...people, ...(await adminIds(db))], user.id, { title: `Lost: ${cur.name}`, body: `${who} marked ${cur.name} as lost: ${b.reason}.`, url });
  } else {
    notifyLater(db, people, user.id, { title: cur.name, body: `${who} moved ${cur.name} to ${STAGE_LABEL[b.to]}.`, url });
  }
  return { ok: true };
});
