import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { schema, type Db } from "@/db";
import { api, HttpError, readJson } from "@/lib/api";
import { nameKey } from "@/lib/format";
import { getCollegeOrThrow } from "@/lib/queries";
import { historySchema } from "@/lib/validators";

const { colleges, collegeYears, collegeSponsorships, collegeArtistEntries, collegeProductionEntries, companies, artists } = schema;

async function companyIdFor(db: Db, brand: string) {
  const key = nameKey(brand);
  if (!key) throw new HttpError(400, "Enter the sponsor name");
  const [c] = await db.select({ id: companies.id }).from(companies).where(eq(companies.nameKey, key)).limit(1);
  if (c) return c.id;
  const [n] = await db.insert(companies).values({ name: brand.trim(), nameKey: key }).returning({ id: companies.id });
  return n.id;
}

const touch = (db: Db, id: number) => db.update(colleges).set({ lastTouchedAt: new Date() }).where(eq(colleges.id, id));

/** Create or update one history row (fest year, sponsor, artist or production line) for a college. */
export const POST = api<{ id: string }>(async ({ req, db, user, params }) => {
  const collegeId = Number(params.id);
  await getCollegeOrThrow(db, user, collegeId);
  const b = historySchema.parse(await readJson(req));

  if (b.section === "year") {
    const v = { ...b.data, collegeId };
    if (b.id) await db.update(collegeYears).set(b.data).where(and(eq(collegeYears.id, b.id), eq(collegeYears.collegeId, collegeId)));
    else await db.insert(collegeYears).values(v);
  } else if (b.section === "sponsor") {
    const { brand, ...rest } = b.data;
    const row = { ...rest, companyId: await companyIdFor(db, brand), collegeId };
    if (b.id) await db.update(collegeSponsorships).set(row).where(and(eq(collegeSponsorships.id, b.id), eq(collegeSponsorships.collegeId, collegeId)));
    else await db.insert(collegeSponsorships).values(row);
  } else if (b.section === "artist") {
    const d = { ...b.data };
    if (d.kind === "item") {
      if (!d.artistId && !d.artistName.trim()) throw new HttpError(400, "Choose an artist");
      if (!d.artistId && d.artistName) {
        const [a] = await db.select({ id: artists.id }).from(artists).where(eq(artists.nameKey, nameKey(d.artistName))).limit(1);
        if (a) d.artistId = a.id;
      }
      if (d.artistId) {
        const [a] = await db.select({ name: artists.name, genre: artists.genre }).from(artists).where(eq(artists.id, d.artistId)).limit(1);
        if (!a) throw new HttpError(400, "That artist isn't in the roster");
        d.artistName = a.name;
        if (!d.genre) d.genre = a.genre;
      }
    } else if (!d.amount) throw new HttpError(400, "Enter the total amount");
    const row = { ...d, artistId: d.artistId ?? null, collegeId };
    if (b.id) await db.update(collegeArtistEntries).set(row).where(and(eq(collegeArtistEntries.id, b.id), eq(collegeArtistEntries.collegeId, collegeId)));
    else await db.insert(collegeArtistEntries).values(row);
  } else {
    const d = b.data;
    if (d.kind === "item" && !d.vendor.trim() && !d.scope.trim()) throw new HttpError(400, "Enter a vendor or scope");
    if (d.kind === "total" && !d.amount) throw new HttpError(400, "Enter the total amount");
    const row = { ...d, collegeId };
    if (b.id) await db.update(collegeProductionEntries).set(row).where(and(eq(collegeProductionEntries.id, b.id), eq(collegeProductionEntries.collegeId, collegeId)));
    else await db.insert(collegeProductionEntries).values(row);
  }
  await touch(db, collegeId);
  return { ok: true };
});

export const DELETE = api<{ id: string }>(async ({ req, db, user, params }) => {
  const collegeId = Number(params.id);
  await getCollegeOrThrow(db, user, collegeId);
  const q = z.object({ section: z.enum(["year", "sponsor", "artist", "production"]), id: z.coerce.number().int() }).parse(Object.fromEntries(req.nextUrl.searchParams));
  const t = { year: collegeYears, sponsor: collegeSponsorships, artist: collegeArtistEntries, production: collegeProductionEntries }[q.section];
  await db.delete(t).where(and(eq(t.id, q.id), eq(t.collegeId, collegeId)));
  await touch(db, collegeId);
  return { ok: true };
});
