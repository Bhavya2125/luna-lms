import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { api, HttpError, readJson } from "@/lib/api";
import { getCollegeOrThrow } from "@/lib/queries";
import { isClosed } from "@/lib/priority";
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
  return { ok: true };
});
