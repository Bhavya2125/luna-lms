import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { api, readJson } from "@/lib/api";
import { getCollegeOrThrow } from "@/lib/queries";
import { noteSchema } from "@/lib/validators";

const { collegeNotes, colleges } = schema;

export const POST = api<{ id: string }>(async ({ req, db, user, params }) => {
  const id = Number(params.id);
  await getCollegeOrThrow(db, user, id);
  const { text } = noteSchema.parse(await readJson(req));
  await db.insert(collegeNotes).values({ collegeId: id, text, byUserId: user.id });
  await db.update(colleges).set({ lastTouchedAt: new Date() }).where(eq(colleges.id, id));
  return { ok: true };
});
