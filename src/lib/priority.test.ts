import assert from "node:assert/strict";
import test from "node:test";
import { addDays, daysBetween, festDate, scoreItem, suggestDue, todayIST } from "./priority";

const T = "2026-11-01";
const base = { stage: "requirements_received", due: null, fest: null, stageEnteredAt: "2026-10-31T10:00:00Z", lastTouchedAt: "2026-10-31T10:00:00Z", value: 0 };

test("date helpers", () => {
  assert.equal(daysBetween("2026-11-01", "2026-11-04"), 3);
  assert.equal(daysBetween("2026-11-04", "2026-11-01"), -3);
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(suggestDue("reach_out", T), "2026-11-04");
  assert.equal(suggestDue("locked", T), null);
  assert.equal(festDate({ festStart: null, festMonth: 1, festYear: 2027 }), "2027-02-01");
  assert.equal(festDate({ festStart: "2027-02-14", festMonth: 1, festYear: 2027 }), "2027-02-14");
  // 20:00 UTC on 31 Oct is already 1 Nov in India
  assert.equal(todayIST(new Date("2026-10-31T20:00:00Z")), "2026-11-01");
});

test("due dates drive urgency and grouping", () => {
  const over = scoreItem({ ...base, due: "2026-10-29" }, T);
  assert.equal(over.group, "overdue");
  assert.ok(over.score >= 56 && over.reasons[0] === "Overdue 3 days");
  assert.equal(scoreItem({ ...base, due: T }, T).group, "today");
  assert.equal(scoreItem({ ...base, due: "2026-11-05" }, T).group, "week");
  assert.equal(scoreItem({ ...base, due: "2026-12-05" }, T).group, "later");
  assert.equal(scoreItem(base, T).group, "later");
});

test("near fests still at an early stage are urgent", () => {
  const s = scoreItem({ ...base, stage: "reach_out", fest: "2026-11-10", stageEnteredAt: T, lastTouchedAt: T }, T);
  assert.equal(s.level, "high");
  assert.deepEqual(s.reasons, ["Fest in 9 days", "Still at Reach Out"]);
  const u = scoreItem({ ...base, stage: "reach_out", fest: "2026-11-10", due: "2026-10-30", stageEnteredAt: T, lastTouchedAt: T }, T);
  assert.equal(u.level, "urgent");
  assert.equal(u.score, 100);
});

test("stuck and quiet deals rise; big deals get a nudge", () => {
  const stuck = scoreItem({ ...base, stageEnteredAt: "2026-10-20T00:00:00Z", lastTouchedAt: "2026-10-31T00:00:00Z" }, T);
  assert.ok(stuck.reasons.some((r) => r.startsWith("In Requirements Received for 12")));
  assert.equal(stuck.score, 20);
  const quiet = scoreItem({ ...base, stage: "locked", stageEnteredAt: "2026-09-01T00:00:00Z", lastTouchedAt: "2026-10-01T00:00:00Z" }, T);
  assert.ok(quiet.reasons.includes("No update in 31 days"));
  assert.ok(scoreItem({ ...base, value: 2_500_000 }, T).reasons.includes("₹20L+ deal"));
  assert.equal(scoreItem({ ...base, fest: "2026-10-01" }, T).reasons[0], "Fest date has passed: update it");
});
