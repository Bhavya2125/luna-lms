import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@/db";
import { api, readJson } from "@/lib/api";
import { pushSub } from "@/lib/validators";

const { pushSubscriptions } = schema;

/** Save this device for push alerts. */
export const POST = api(async ({ req, db, user }) => {
  const b = pushSub.parse(await readJson(req));
  await db
    .insert(pushSubscriptions)
    .values({ userId: user.id, endpoint: b.endpoint, p256dh: b.keys.p256dh, auth: b.keys.auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: user.id, p256dh: b.keys.p256dh, auth: b.keys.auth } });
  return { ok: true };
});

export const DELETE = api(async ({ req, db, user }) => {
  const { endpoint } = z.object({ endpoint: z.string().url() }).parse(await readJson(req));
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, user.id)));
  return { ok: true };
});
