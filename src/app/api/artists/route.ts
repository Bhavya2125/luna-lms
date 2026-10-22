import { asc, count, eq, sql } from "drizzle-orm";
import { schema } from "@/db";
import { api, isAdmin, readJson } from "@/lib/api";
import { nameKey, normPhone } from "@/lib/format";
import { artistCreate } from "@/lib/validators";

const { artists, artistContacts, artistManualShows, collegeArtistEntries } = schema;

/** Roster. Everyone sees names, genre, crew and riders; contacts and fees are admin-only. */
export const GET = api(async ({ db, user }) => {
  const admin = isAdmin(user.role);
  const list = await db.select().from(artists).orderBy(asc(sql`lower(${artists.name})`));
  const contacts = admin ? await db.select().from(artistContacts).orderBy(asc(artistContacts.id)) : [];
  const hist = await db
    .select({ id: collegeArtistEntries.artistId, n: count() })
    .from(collegeArtistEntries)
    .where(eq(collegeArtistEntries.kind, "item"))
    .groupBy(collegeArtistEntries.artistId);
  const manual = await db.select({ id: artistManualShows.artistId, n: count() }).from(artistManualShows).groupBy(artistManualShows.artistId);
  return list.map((a) => ({
    id: a.id,
    name: a.name,
    stageName: a.stageName,
    genre: a.genre,
    crewCount: a.crewCount,
    riderNotes: a.riderNotes,
    techRiderUrl: a.techRiderUrl,
    hospitalityRiderUrl: a.hospitalityRiderUrl,
    shows: (hist.find((h) => h.id === a.id)?.n ?? 0) + (manual.find((m) => m.id === a.id)?.n ?? 0),
    lastRate: admin ? a.lastRate : null,
    contacts: admin ? contacts.filter((c) => c.artistId === a.id) : null,
  }));
});

export const POST = api(
  async ({ req, db }) => {
    const b = artistCreate.parse(await readJson(req));
    const id = await db.transaction(async (tx) => {
      const { contacts, ...rest } = b;
      const [row] = await tx
        .insert(artists)
        .values({ ...rest, nameKey: nameKey(b.name), lastRateDate: rest.lastRate ? new Date().toISOString().slice(0, 10) : null })
        .returning({ id: artists.id });
      const cs = contacts.filter((c) => c.name || c.phone).map((c) => ({ ...c, phone: normPhone(c.phone), artistId: row.id }));
      if (cs.length) await tx.insert(artistContacts).values(cs);
      return row.id;
    });
    return { id };
  },
  { roles: ["admin", "super_admin"] },
);
