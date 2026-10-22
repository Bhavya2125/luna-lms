import { STAGE_LABEL } from "./stages";

/*
 * Stages and dates are separate. A stage says where a deal is; dates are only ever set by people:
 *  - next step due: when the current task should be done
 *  - target date: the overall deadline for the college or sponsor deal (e.g. "lock by")
 * Priority comes from those dates, the fest date and how quiet the deal has been.
 */

const EARLY = ["reach_out", "initial_connect"];
const CLOSED = ["locked", "lost"];
export const isClosed = (stage: string) => CLOSED.includes(stage);

export type Level = "urgent" | "high" | "normal" | "low";
export type Group = "overdue" | "today" | "week" | "later";
export type Scored = { score: number; level: Level; group: Group; reasons: string[]; dueIn: number | null; targetIn: number | null; festIn: number | null };
export type PriorityInput = {
  stage: string;
  due: string | null; // next step due, YYYY-MM-DD
  target: string | null; // overall target date, YYYY-MM-DD
  fest: string | null; // fest start, YYYY-MM-DD
  lastTouchedAt: Date | string | null;
  value: number; // rupees
};

const DAY = 864e5;
/** Today's date in India as YYYY-MM-DD; the team works in IST whatever timezone the server uses. */
export const todayIST = (now = new Date()) => new Date(now.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
const dayNum = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY;
export const daysBetween = (fromIso: string, toIso: string) => Math.round(dayNum(toIso) - dayNum(fromIso));
export const addDays = (iso: string, n: number) => new Date((dayNum(iso) + n) * DAY).toISOString().slice(0, 10);
/** When a fest starts: its exact start date, else the first of its month. */
export const festDate = (c: { festStart: string | null; festMonth: number; festYear: number }) =>
  c.festStart ?? `${c.festYear}-${String(c.festMonth + 1).padStart(2, "0")}-01`;

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** Scores an open item 0-100 and explains why. */
export function scoreItem(i: PriorityInput, today = todayIST()): Scored {
  const reasons: string[] = [];
  let score = 0;
  const dueIn = i.due ? daysBetween(today, i.due) : null;
  const targetIn = i.target ? daysBetween(today, i.target) : null;
  const festIn = i.fest ? daysBetween(today, i.fest) : null;

  if (dueIn !== null) {
    if (dueIn < 0) {
      score += 50 + Math.min(-dueIn, 10) * 2;
      reasons.push(`Step overdue ${plural(-dueIn, "day")}`);
    } else if (dueIn === 0) {
      score += 45;
      reasons.push("Step due today");
    } else if (dueIn <= 3) {
      score += 35;
      reasons.push(`Step due in ${plural(dueIn, "day")}`);
    } else if (dueIn <= 7) {
      score += 25;
      reasons.push(`Step due in ${plural(dueIn, "day")}`);
    }
  }
  if (targetIn !== null) {
    if (targetIn < 0) {
      score += 45 + Math.min(-targetIn, 10) * 2;
      reasons.push(`Target passed ${plural(-targetIn, "day")} ago`);
    } else if (targetIn === 0) {
      score += 40;
      reasons.push("Target is today");
    } else {
      const pts = targetIn <= 7 ? 30 : targetIn <= 14 ? 20 : targetIn <= 30 ? 10 : 0;
      score += pts;
      if (pts) reasons.push(`Target in ${plural(targetIn, "day")}`);
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
  if (i.lastTouchedAt) {
    const quiet = daysBetween(todayIST(typeof i.lastTouchedAt === "string" ? new Date(i.lastTouchedAt) : i.lastTouchedAt), today);
    if (quiet >= 14) {
      score += 10;
      reasons.push(`No update in ${plural(quiet, "day")}`);
    }
  }
  if (i.value >= 2_000_000) {
    score += 5;
    reasons.push("₹20L+ deal");
  }

  score = Math.max(0, Math.min(100, score));
  const level: Level = score >= 70 ? "urgent" : score >= 45 ? "high" : score >= 20 ? "normal" : "low";
  // the earlier of the two dates decides where it sits in the queue
  const dates = [dueIn, targetIn].filter((d): d is number => d !== null);
  const soonest = dates.length ? Math.min(...dates) : null;
  const group: Group = soonest === null ? "later" : soonest < 0 ? "overdue" : soonest === 0 ? "today" : soonest <= 7 ? "week" : "later";
  return { score, level, group, reasons, dueIn, targetIn, festIn };
}

export const LEVEL_LABEL: Record<Level, string> = { urgent: "Urgent", high: "High", normal: "Normal", low: "Low" };
