import { NextRequest, NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { computeAlerts } from "@/lib/alerts";
import { buildHome } from "@/lib/home";
import { configurePush, pushToUser } from "@/lib/push";

const { alertDispatch, collegeAssignments, pushSubscriptions, users } = schema;

/**
 * Daily job, called by a scheduler with "Authorization: Bearer <CRON_SECRET>".
 * 1. Fest alerts, each sent once, to the people assigned to the college (or to admins when nobody is).
 * 2. A personal summary for everyone with something overdue or due today.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization")?.trim() !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const problem = configurePush();
  if (problem === "Push keys are not configured on the server") return NextResponse.json({ sent: 0, note: "Push keys are not configured" });
  if (problem) return NextResponse.json({ error: `${problem}. Regenerate them with "npx web-push generate-vapid-keys" and paste only the key text.` }, { status: 500 });

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
      for (const uid of recipients) {
        const r = await pushToUser(db, uid, { title: "Luna Wave", body: a.message, url: `/colleges?open=${a.collegeId}` });
        sent += r.sent;
        failed += r.failed;
      }
      await db.insert(alertDispatch).values({ collegeId: a.collegeId, festYear: a.festYear, kind: a.kind }).onConflictDoNothing();
    }

    let digests = 0;
    const subscribers = [...new Set((await db.select({ userId: pushSubscriptions.userId }).from(pushSubscriptions)).map((r) => r.userId))];
    for (const uid of subscribers) {
      const [u] = await db.select({ id: users.id, name: users.name, role: users.role, active: users.active }).from(users).where(eq(users.id, uid)).limit(1);
      if (!u?.active) continue;
      const home = await buildHome(db, u, u);
      const { overdue, today } = home.summary;
      if (!overdue && !today) continue;
      const top = home.items[0];
      const parts = [overdue && `${overdue} overdue`, today && `${today} due today`].filter(Boolean).join(", ");
      const body = `${parts}${top ? `. Start with ${top.title}${top.nextAction ? `: ${top.nextAction}` : ""}.` : "."}`;
      const r = await pushToUser(db, uid, { title: "Your day in Luna Wave", body, url: "/home" });
      digests += r.sent;
      failed += r.failed;
    }
    return NextResponse.json({ alerts: alerts.length, sent, digests, failed });
  } catch (e) {
    console.error("cron/alerts failed", e);
    const cause = (e as { cause?: Error }).cause ?? (e as Error);
    return NextResponse.json({ error: `Alerts job failed: ${cause.message}` }, { status: 500 });
  }
}
