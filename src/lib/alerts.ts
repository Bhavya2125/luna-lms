import "server-only";
import { and, inArray, notInArray } from "drizzle-orm";
import { schema, type Db } from "@/db";
import { MONTHS } from "./stages";

export type Alert = {
  collegeId: number;
  college: string;
  festYear: number;
  kind: "check" | "advance";
  message: string;
  daysUntil: number;
};

const DAY = 864e5;

/** When the fest starts: the exact start date if known, otherwise the first of its month. */
export function festTarget(c: { festStart: string | null; festMonth: number | null; festYear: number }) {
  if (c.festStart) return new Date(c.festStart + "T00:00:00");
  return c.festMonth == null ? null : new Date(c.festYear, c.festMonth, 1);
}

/**
 * One month before a fest, assigned people are reminded (colleges nobody has picked up or touched yet, such as an
 * imported lead list, stay quiet until someone is assigned):
 *  - "check": nobody has touched the college in the last 30 days, so confirm dates, convenors and artist needs.
 *  - "advance": details were updated but the deal is still at Reach Out.
 */
export async function computeAlerts(db: Db, collegeIds: number[] | "all", now = new Date()): Promise<Alert[]> {
  const { colleges } = schema;
  const rows = await db
    .select()
    .from(colleges)
    .where(and(notInArray(colleges.stage, ["locked", "lost"]), collegeIds === "all" ? undefined : inArray(colleges.id, collegeIds.length ? collegeIds : [-1])));
  const assigned = new Set((await db.selectDistinct({ id: schema.collegeAssignments.collegeId }).from(schema.collegeAssignments)).map((r) => r.id));
  const out: Alert[] = [];
  for (const c of rows) {
    const when = festTarget(c);
    if (!when || (!assigned.has(c.id) && !c.lastTouchedAt)) continue;
    const daysUntil = Math.ceil((when.getTime() - now.getTime()) / DAY);
    if (daysUntil <= 0 || daysUntil > 31) continue;
    const touchedRecently = !!c.lastTouchedAt && now.getTime() - c.lastTouchedAt.getTime() < 30 * DAY;
    const label = `${MONTHS[c.festMonth ?? when.getMonth()]} ${c.festYear}`;
    if (!touchedRecently) {
      out.push({ collegeId: c.id, college: c.name, festYear: c.festYear, kind: "check", daysUntil, message: `${c.name} fest is in ${label}. Time to check for new dates, convenors and artist requirements.` });
    } else if (c.stage === "reach_out") {
      out.push({ collegeId: c.id, college: c.name, festYear: c.festYear, kind: "advance", daysUntil, message: `${c.name} details were updated but the deal is still at Reach Out. Move it to Initial Connect.` });
    }
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}
