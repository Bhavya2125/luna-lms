import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@/db";
import { api, readJson } from "@/lib/api";
import { showSchema } from "@/lib/validators";

const { artistManualShows } = schema;

/** Shows added by hand (the rest come from college history). */
export const POST = api<{ id: string }>(
  async ({ req, db, params }) => {
    const artistId = Number(params.id);
    const { id, ...b } = showSchema.parse(await readJson(req));
    if (id) await db.update(artistManualShows).set(b).where(and(eq(artistManualShows.id, id), eq(artistManualShows.artistId, artistId)));
    else await db.insert(artistManualShows).values({ ...b, artistId });
    return { ok: true };
  },
  { roles: ["admin", "super_admin"] },
);

export const DELETE = api<{ id: string }>(
  async ({ req, db, params }) => {
    const { showId } = z.object({ showId: z.coerce.number().int() }).parse(Object.fromEntries(req.nextUrl.searchParams));
    await db.delete(artistManualShows).where(and(eq(artistManualShows.id, showId), eq(artistManualShows.artistId, Number(params.id))));
    return { ok: true };
  },
  { roles: ["admin", "super_admin"] },
);
