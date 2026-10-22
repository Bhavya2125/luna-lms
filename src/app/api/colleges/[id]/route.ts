import { and, asc, desc, eq, ne } from "drizzle-orm";
import { schema } from "@/db";
import { api, HttpError, readJson } from "@/lib/api";
import { collegeKey } from "@/lib/format";
import { assigneesFor, getCollegeOrThrow } from "@/lib/queries";
import { collegeUpdate } from "@/lib/validators";

const { colleges, collegeNotes, collegeStageLog, users, collegeYears, collegeSponsorships, companies, collegeArtistEntries, collegeProductionEntries } = schema;

export const GET = api<{ id: string }>(async ({ db, user, params }) => {
  const id = Number(params.id);
  const college = await getCollegeOrThrow(db, user, id);
  const assignees = (await assigneesFor(db, [id])).get(id) ?? [];
  const notes = await db
    .select({ id: collegeNotes.id, text: collegeNotes.text, at: collegeNotes.at, by: users.name })
    .from(collegeNotes)
    .leftJoin(users, eq(users.id, collegeNotes.byUserId))
    .where(eq(collegeNotes.collegeId, id))
    .orderBy(desc(collegeNotes.at));
  const log = await db
    .select({ id: collegeStageLog.id, from: collegeStageLog.fromStage, to: collegeStageLog.toStage, reason: collegeStageLog.reason, at: collegeStageLog.at, by: users.name })
    .from(collegeStageLog)
    .leftJoin(users, eq(users.id, collegeStageLog.byUserId))
    .where(eq(collegeStageLog.collegeId, id))
    .orderBy(desc(collegeStageLog.at), desc(collegeStageLog.id));
  const years = await db.select().from(collegeYears).where(eq(collegeYears.collegeId, id)).orderBy(desc(collegeYears.year));
  const sponsors = await db
    .select({
      id: collegeSponsorships.id,
      companyId: collegeSponsorships.companyId,
      brand: companies.name,
      year: collegeSponsorships.year,
      title: collegeSponsorships.title,
      amount: collegeSponsorships.amount,
      deliverables: collegeSponsorships.deliverables,
      exclusive: collegeSponsorships.exclusive,
      eventMonth: collegeSponsorships.eventMonth,
      eventDate: collegeSponsorships.eventDate,
      notes: collegeSponsorships.notes,
    })
    .from(collegeSponsorships)
    .innerJoin(companies, eq(companies.id, collegeSponsorships.companyId))
    .where(eq(collegeSponsorships.collegeId, id))
    .orderBy(desc(collegeSponsorships.year), asc(companies.name));
  const artistEntries = await db.select().from(collegeArtistEntries).where(eq(collegeArtistEntries.collegeId, id)).orderBy(desc(collegeArtistEntries.year), asc(collegeArtistEntries.day));
  const productionEntries = await db.select().from(collegeProductionEntries).where(eq(collegeProductionEntries.collegeId, id)).orderBy(desc(collegeProductionEntries.year), asc(collegeProductionEntries.day));
  return { college, assignees, notes, log, years, sponsors, artistEntries, productionEntries };
});

export const PATCH = api<{ id: string }>(async ({ req, db, user, params }) => {
  const id = Number(params.id);
  const cur = await getCollegeOrThrow(db, user, id);
  const b = collegeUpdate.parse(await readJson(req));
  const patch: Record<string, unknown> = { ...b, updatedAt: new Date(), lastTouchedAt: new Date() };
  if (b.festStart) {
    patch.festMonth = Number(b.festStart.slice(5, 7)) - 1;
    patch.festYear = Number(b.festStart.slice(0, 4));
  }
  if (b.name !== undefined || b.city !== undefined) {
    const name = (b.name ?? cur.name).replace(/\s+/g, " ");
    const city = b.city ?? cur.city;
    const key = collegeKey(name, city);
    const [dup] = await db.select({ name: colleges.name }).from(colleges).where(and(eq(colleges.nameKey, key), ne(colleges.id, id))).limit(1);
    if (dup) throw new HttpError(409, `${dup.name} already exists in ${city}`);
    patch.name = name;
    patch.nameKey = key;
  }
  await db.update(colleges).set(patch).where(eq(colleges.id, id));
  return { ok: true };
});
