import { STAGE_LABEL } from "./stages";

/** Default days a deal should stay in a stage before its next step is due. Any date can be chosen instead. */
export const STAGE_DAYS: Record<string, number> = {
  reach_out: 3,
  initial_connect: 7,
  requirements_received: 5,
  rates_proposed: 7,
  proposal_sent: 7,
};
const EARLY = ["reach_out", "initial_connect"];
const CLOSED = ["locked", "lost"];
export const isClosed = (stage: string) => CLOSED.includes(stage);

export type Level = "urgent" | "high" | "normal" | "low";
export type Group = "overdue" | "today" | "week" | "later";
export type Scored = { score: number; level: Level; group: Group; reasons: string[]; dueIn: number | null; festIn: number | null };
export type PriorityInput = {
  stage: string;
  due: string | null; // YYYY-MM-DD
  fest: string | null; // YYYY-MM-DD
  stageEnteredAt: Date | string | null;
  lastTouchedAt: Date | string | null;
  value: number; // rupees
};

const DAY = 864e5;
/** Today's date in India as YYYY-MM-DD; the team works in IST whatever timezone the server uses. */
export const todayIST = (now = new Date()) => new Date(now.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
const dayNum = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY;
export const daysBetween = (fromIso: string, toIso: string) => Math.round(dayNum(toIso) - dayNum(fromIso));
export const addDays = (iso: string, n: number) => new Date((dayNum(iso) + n) * DAY).toISOString().slice(0, 10);
/** Suggested due date for the next step after entering a stage. */
export const suggestDue = (stage: string, today = todayIST()) => (STAGE_DAYS[stage] ? addDays(today, STAGE_DAYS[stage]) : null);
/** When a fest starts: its exact start date, else the first of its month. */
export const festDate = (c: { festStart: string | null; festMonth: number; festYear: number }) =>
  c.festStart ?? `${c.festYear}-${String(c.festMonth + 1).padStart(2, "0")}-01`;

const ago = (d: Date | string | null, today: string) => (d ? daysBetween(todayIST(typeof d === "string" ? new Date(d) : d), today) : null);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** Scores an open item 0-100 and explains why. See the home-page plan for the weights. */
export function scoreItem(i: PriorityInput, today = todayIST()): Scored {
  const reasons: string[] = [];
  let score = 0;
  const dueIn = i.due ? daysBetween(today, i.due) : null;
  const festIn = i.fest ? daysBetween(today, i.fest) : null;

  if (dueIn !== null) {
    if (dueIn < 0) {
      score += 50 + Math.min(-dueIn, 10) * 2;
      reasons.push(`Overdue ${plural(-dueIn, "day")}`);
    } else if (dueIn === 0) {
      score += 45;
      reasons.push("Due today");
    } else if (dueIn <= 3) {
      score += 35;
      reasons.push(`Due in ${plural(dueIn, "day")}`);
    } else if (dueIn <= 7) {
      score += 25;
      reasons.push(`Due in ${plural(dueIn, "day")}`);
    }
  }
  if (festIn !== null) {
    if (festIn < 0) {
      score += 10;
      reasons.push("Fest date has passed: update it");
    } else {
      const pts = festIn <= 14 ? 40 : festIn <= 30 ? 30 : festIn <= 60 ? 15 : festIn <= 90 ? 5 : 0;
      score += pts;
      if (pts) reasons.push(festIn === 0 ? "Fest starts today" : `Fest in ${plural(festIn, "day")}`);
      if (festIn <= 45 && EARLY.includes(i.stage)) {
        score += 15;
        reasons.push(`Still at ${STAGE_LABEL[i.stage]}`);
      }
    }
  }
  const inStage = ago(i.stageEnteredAt, today);
  const quiet = ago(i.lastTouchedAt ?? i.stageEnteredAt, today);
  const limit = STAGE_DAYS[i.stage];
  let stuck = 0;
  let stuckWhy = "";
  if (limit && inStage !== null && inStage > limit) {
    stuck = inStage > 2 * limit ? 20 : 10;
    stuckWhy = `In ${STAGE_LABEL[i.stage]} for ${plural(inStage, "day")}`;
  }
  if (quiet !== null && quiet >= 14 && stuck < 10) {
    stuck = 10;
    stuckWhy = `No update in ${plural(quiet, "day")}`;
  }
  if (stuck) {
    score += stuck;
    reasons.push(stuckWhy);
  }
  if (i.value >= 2_000_000) {
    score += 5;
    reasons.push("₹20L+ deal");
  }

  score = Math.max(0, Math.min(100, score));
  const level: Level = score >= 70 ? "urgent" : score >= 45 ? "high" : score >= 20 ? "normal" : "low";
  const group: Group = dueIn === null ? "later" : dueIn < 0 ? "overdue" : dueIn === 0 ? "today" : dueIn <= 7 ? "week" : "later";
  return { score, level, group, reasons, dueIn, festIn };
}

export const LEVEL_LABEL: Record<Level, string> = { urgent: "Urgent", high: "High", normal: "Normal", low: "Low" };
