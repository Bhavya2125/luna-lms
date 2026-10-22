import { asc, desc, eq } from "drizzle-orm";
import { schema } from "@/db";
import { api, HttpError, isAdmin, readJson } from "@/lib/api";
import { nameKey, normPhone } from "@/lib/format";
import { artistUpdate } from "@/lib/validators";

const { artists, artistContacts, artistManualShows, collegeArtistEntries, colleges } = schema;

export const GET = api<{ id: string }>(async ({ db, user, params }) => {
  const id = Number(params.id);
  const admin = isAdmin(user.role);
  const [artist] = await db.select().from(artists).where(eq(artists.id, id)).limit(1);
  if (!artist) throw new HttpError(404, "Artist not found");
  const contacts = admin ? await db.select().from(artistContacts).where(eq(artistContacts.artistId, id)).orderBy(asc(artistContacts.id)) : null;
  const history = await db
    .select({
      id: collegeArtistEntries.id,
      collegeId: collegeArtistEntries.collegeId,
      college: colleges.name,
      year: collegeArtistEntries.year,
      day: collegeArtistEntries.day,
      amount: collegeArtistEntries.amount,
      travel: collegeArtistEntries.travel,
      travelExtra: collegeArtistEntries.travelExtra,
      notes: collegeArtistEntries.notes,
    })
    .from(collegeArtistEntries)
    .innerJoin(colleges, eq(colleges.id, collegeArtistEntries.collegeId))
    .where(eq(collegeArtistEntries.artistId, id))
    .orderBy(desc(collegeArtistEntries.year));
  const manual = await db.select().from(artistManualShows).where(eq(artistManualShows.artistId, id)).orderBy(desc(artistManualShows.year));
  // fees are admin-only
  return {
    artist: admin ? artist : { ...artist, lastRate: null },
    contacts,
    history: history.map((h) => (admin ? h : { ...h, amount: null, travelExtra: null })),
    manual: manual.map((m) => (admin ? m : { ...m, amount: null, travelExtra: null })),
  };
});

export const PATCH = api<{ id: string }>(
  async ({ req, db, params }) => {
    const id = Number(params.id);
    const b = artistUpdate.parse(await readJson(req));
    await db.transaction(async (tx) => {
      const { contacts, ...rest } = b;
      const patch: Record<string, unknown> = { ...rest };
      if (rest.name !== undefined) patch.nameKey = nameKey(rest.name);
      if (rest.lastRate !== undefined) patch.lastRateDate = new Date().toISOString().slice(0, 10);
      if (Object.keys(patch).length) await tx.update(artists).set(patch).where(eq(artists.id, id));
      if (rest.name !== undefined) await tx.update(collegeArtistEntries).set({ artistName: rest.name }).where(eq(collegeArtistEntries.artistId, id));
      if (contacts) {
        await tx.delete(artistContacts).where(eq(artistContacts.artistId, id));
        const cs = contacts.filter((c) => c.name || c.phone).map((c) => ({ ...c, phone: normPhone(c.phone), artistId: id }));
        if (cs.length) await tx.insert(artistContacts).values(cs);
      }
    });
    return { ok: true };
  },
  { roles: ["admin", "super_admin"] },
);

export const DELETE = api<{ id: string }>(
  async ({ db, params }) => {
    await db.delete(artists).where(eq(artists.id, Number(params.id)));
    return { ok: true };
  },
  { roles: ["admin", "super_admin"] },
);
