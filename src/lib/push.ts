import "server-only";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import { schema, type Db } from "@/db";

/** Env values pasted into a dashboard often carry spaces, quotes or a "Public Key:" label. */
const clean = (v?: string) => (v ?? "").replace(/^\s*(public|private)\s*key:?\s*/i, "").replace(/["'\s]/g, "");

/** Sets up web-push from the environment. Returns null when ready, or a sentence explaining what's wrong. */
export function configurePush(): string | null {
  const pub = clean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const priv = clean(process.env.VAPID_PRIVATE_KEY);
  if (!pub || !priv) return "Push keys are not configured on the server";
  let subject = (process.env.VAPID_SUBJECT ?? "").trim();
  if (subject && !/^(mailto:|https:)/i.test(subject)) subject = subject.includes("@") ? `mailto:${subject}` : "";
  try {
    webpush.setVapidDetails(subject || "mailto:admin@lunawave.example", pub, priv);
    return null;
  } catch (e) {
    return `Push keys are not valid: ${(e as Error).message}`;
  }
}

/** Sends one notification to every device a person turned alerts on for. Dead subscriptions are removed. */
export async function pushToUser(db: Db, userId: number, payload: { title: string; body: string; url: string }) {
  const { pushSubscriptions } = schema;
  let sent = 0;
  let failed = 0;
  for (const s of await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
      sent++;
    } catch (e) {
      failed++;
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
    }
  }
  return { sent, failed };
}
