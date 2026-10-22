import "server-only";
import { asc, eq } from "drizzle-orm";
import { schema, type Db } from "@/db";
import { festDate, isClosed, scoreItem, todayIST, daysBetween, type Scored } from "./priority";
import type { Role } from "./stages";

export type QueueItem = Scored & {
  key: string;
  kind: "college" | "deal";
  id: number;
  collegeId: number | null;
  companyId: number | null;
  title: string;
  sub: string;
  stage: string;
  nextAction: string;
  nextActionDue: string | null;
  targetDate: string | null;
  phone: string;
  fest: string | null;
};
export type TimelineFest = { collegeId: number; name: string; fest: string; days: number; stage: string; behind: boolean; mine: boolean };
export type TeamRow = { id: number; name: string; role: Role; open: number; overdue: number; today: number; urgent: number };
export type HomeData = {
  viewing: { id: number; name: string; role: Role };
  today: string;
  summary: { overdue: number; today: number; festsThisMonth: number; awaiting: number };
  items: QueueItem[];
  timeline: TimelineFest[];
  team?: TeamRow[];
  unassigned?: { collegeId: number; name: string; fest: string; days: number; stage: string }[];
  pipeline?: { colleges: Record<string, number>; deals: Record<string, number>; lockedValue: number };
};

const AWAITING = ["rates_proposed", "proposal_sent"];
const isAdminRole = (r: Role) => r === "admin" || r === "super_admin";

/** Everything the Home screen needs for one person: their prioritised work, fests ahead and, for admins, the team. */
export async function buildHome(db: Db, viewer: { id: number; role: Role }, target: { id: number; name: string; role: Role }, now = new Date()): Promise<HomeData> {
  const today = todayIST(now);
  const { colleges, collegeAssignments, sponsorDeals, companies, users } = schema;
  const allColleges = await db.select().from(colleges);
  const assignments = await db.select().from(collegeAssignments);
  const deals = await db
    .select({ d: sponsorDeals, company: companies.name })
    .from(sponsorDeals)
    .innerJoin(companies, eq(companies.id, sponsorDeals.companyId));
  const byId = new Map(allColleges.map((c) => [c.id, c]));
  const assignedTo = (userId: number) => new Set(assignments.filter((a) => a.userId === userId).map((a) => a.collegeId));

  function itemsFor(userId: number): QueueItem[] {
    const mine = assignedTo(userId);
    const out: QueueItem[] = [];
    for (const c of allColleges) {
      if (!mine.has(c.id) || isClosed(c.stage)) continue;
      const fest = festDate(c);
      out.push({
        key: `c${c.id}`,
        kind: "college",
        id: c.id,
        collegeId: c.id,
        companyId: null,
        title: c.name,
        sub: [c.festName, c.city].filter(Boolean).join(" · "),
        stage: c.stage,
        nextAction: c.nextAction,
        nextActionDue: c.nextActionDue,
        phone: c.convenorPhone,
        fest,
        targetDate: c.targetDate,
        ...scoreItem({ stage: c.stage, due: c.nextActionDue, target: c.targetDate, fest, lastTouchedAt: c.lastTouchedAt ?? c.stageEnteredAt, value: Math.max(c.dealAmount, c.artistBudget + c.prodBudget) }, today),
      });
    }
    for (const { d, company } of deals) {
      if (isClosed(d.stage)) continue;
      const ok = d.collegeId ? mine.has(d.collegeId) : d.createdBy === userId;
      if (!ok) continue;
      const c = d.collegeId ? byId.get(d.collegeId) : undefined;
      const fest = c ? festDate(c) : null;
      out.push({
        key: `d${d.id}`,
        kind: "deal",
        id: d.id,
        collegeId: d.collegeId,
        companyId: d.companyId,
        title: company,
        sub: c ? `Sponsor · ${c.name}` : "Sponsor · Overall",
        stage: d.stage,
        nextAction: d.nextAction,
        nextActionDue: d.nextActionDue,
        phone: d.contactPhone,
        fest,
        targetDate: d.targetDate,
        ...scoreItem({ stage: d.stage, due: d.nextActionDue, target: d.targetDate, fest, lastTouchedAt: d.updatedAt, value: d.amount }, today),
      });
    }
    return out.sort((a, b) => b.score - a.score || (a.dueIn ?? 999) - (b.dueIn ?? 999) || a.title.localeCompare(b.title));
  }

  const items = itemsFor(target.id);
  const mine = assignedTo(target.id);
  const showAll = isAdminRole(target.role) && viewer.id === target.id;
  const month = today.slice(0, 7);
  const timeline: TimelineFest[] = allColleges
    .filter((c) => c.stage !== "lost" && (showAll || mine.has(c.id)))
    .map((c) => {
      const fest = festDate(c);
      return { collegeId: c.id, name: c.name, fest, days: daysBetween(today, fest), stage: c.stage, behind: ["reach_out", "initial_connect"].includes(c.stage), mine: mine.has(c.id) };
    })
    .filter((f) => f.days >= 0 && f.days <= 60)
    .sort((a, b) => a.days - b.days);

  const data: HomeData = {
    viewing: target,
    today,
    summary: {
      overdue: items.filter((i) => i.group === "overdue").length,
      today: items.filter((i) => i.group === "today").length,
      festsThisMonth: items.filter((i) => i.kind === "college" && i.fest?.startsWith(month)).length,
      awaiting: items.filter((i) => AWAITING.includes(i.stage)).length,
    },
    items,
    timeline,
  };

  if (isAdminRole(viewer.role) && viewer.id === target.id) {
    const people = await db.select({ id: users.id, name: users.name, role: users.role, active: users.active }).from(users).orderBy(asc(users.name));
    data.team = people
      .filter((p) => p.active)
      .map((p) => {
        const q = itemsFor(p.id);
        return { id: p.id, name: p.name, role: p.role, open: q.length, overdue: q.filter((i) => i.group === "overdue").length, today: q.filter((i) => i.group === "today").length, urgent: q.filter((i) => i.level === "urgent").length };
      })
      .filter((t) => t.open > 0)
      .sort((a, b) => b.urgent - a.urgent || b.overdue - a.overdue || a.name.localeCompare(b.name));
    const assigned = new Set(assignments.map((a) => a.collegeId));
    data.unassigned = allColleges
      .filter((c) => !assigned.has(c.id) && !isClosed(c.stage))
      .map((c) => ({ collegeId: c.id, name: c.name, fest: festDate(c), days: daysBetween(today, festDate(c)), stage: c.stage }))
      .filter((u) => u.days >= 0 && u.days <= 60)
      .sort((a, b) => a.days - b.days);
    const count = (stages: string[]) => stages.reduce<Record<string, number>>((m, s) => ((m[s] = (m[s] ?? 0) + 1), m), {});
    data.pipeline = {
      colleges: count(allColleges.map((c) => c.stage)),
      deals: count(deals.map((x) => x.d.stage)),
      lockedValue: allColleges.filter((c) => c.stage === "locked").reduce((s, c) => s + c.dealAmount, 0) + deals.filter((x) => x.d.stage === "locked").reduce((s, x) => s + x.d.amount, 0),
    };
  }
  return data;
}
