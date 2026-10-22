import { NextRequest, NextResponse } from "next/server";
import { eq, inArray, or } from "drizzle-orm";
import webpush from "web-push";
import { getDb, schema } from "@/db";
import { computeAlerts } from "@/lib/alerts";

const { alertDispatch, collegeAssignments, pushSubscriptions, users } = schema;

/** Env values pasted into a dashboard often carry spaces, quotes or a "Public Key:" label. */
const clean = (v?: string) => (v ?? "").replace(/^\s*(public|private)\s*key:?\s*/i, "").replace(/["'\s]/g, "");

/**
 * Daily job, called by a scheduler with "Authorization: Bearer <CRON_SECRET>".
 * Sends each new alert once, to the people assigned to the college (or to admins when nobody is assigned).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization")?.trim() !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pub = clean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const priv = clean(process.env.VAPID_PRIVATE_KEY);
  if (!pub || !priv) return NextResponse.json({ sent: 0, note: "Push keys are not configured" });
  let subject = (process.env.VAPID_SUBJECT ?? "").trim();
  if (subject && !/^(mailto:|https:)/i.test(subject)) subject = subject.includes("@") ? `mailto:${subject}` : "";
  try {
    webpush.setVapidDetails(subject || "mailto:admin@lunawave.example", pub, priv);
  } catch (e) {
    return NextResponse.json(
      { error: `Push keys are not valid: ${(e as Error).message}. Regenerate them with "npx web-push generate-vapid-keys" and paste only the key text into Render.` },
      { status: 500 },
    );
  }

  try {
    const db = await getDb();
    const alerts = await computeAlerts(db, "all");
    let sent = 0;
    let failed = 0;
    for (const a of alerts) {
      const sentBefore = await db.select().from(alertDispatch).where(eq(alertDispatch.collegeId, a.collegeId));
      if (sentBefore.some((r) => r.festYear === a.festYear && r.kind === a.kind)) continue;
      const assigned = await db.select({ id: collegeAssignments.userId }).from(collegeAssignments).where(eq(collegeAssignments.collegeId, a.collegeId));
      const recipients = assigned.length
        ? assigned.map((r) => r.id)
        : (await db.select({ id: users.id }).from(users).where(or(eq(users.role, "admin"), eq(users.role, "super_admin")))).map((r) => r.id);
      const subs = recipients.length ? await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, recipients)) : [];
      for (const s of subs) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: "Luna Wave", body: a.message, url: `/colleges?open=${a.collegeId}` }));
          sent++;
        } catch (e) {
          failed++;
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
        }
      }
      await db.insert(alertDispatch).values({ collegeId: a.collegeId, festYear: a.festYear, kind: a.kind }).onConflictDoNothing();
    }
    return NextResponse.json({ alerts: alerts.length, sent, failed });
  } catch (e) {
    console.error("cron/alerts failed", e);
    const cause = (e as { cause?: Error }).cause ?? (e as Error);
    return NextResponse.json({ error: `Alerts job failed: ${cause.message}` }, { status: 500 });
  }
}
