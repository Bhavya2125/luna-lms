import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { api, readJson } from "@/lib/api";
import { getCollegeOrThrow } from "@/lib/queries";
import { collegePeople, firstName, notifyLater } from "@/lib/notify";
import { noteSchema } from "@/lib/validators";

const { collegeNotes, colleges } = schema;

export const POST = api<{ id: string }>(async ({ req, db, user, params }) => {
  const id = Number(params.id);
  const c = await getCollegeOrThrow(db, user, id);
  const { text } = noteSchema.parse(await readJson(req));
  await db.insert(collegeNotes).values({ collegeId: id, text, byUserId: user.id });
  await db.update(colleges).set({ lastTouchedAt: new Date() }).where(eq(colleges.id, id));
  const short = text.length > 120 ? `${text.slice(0, 117)}…` : text;
  notifyLater(db, await collegePeople(db, id), user.id, { title: `Note on ${c.name}`, body: `${firstName(user.name)}: ${short}`, url: `/colleges?open=${id}` });
  return { ok: true };
});
