import assert from "node:assert/strict";
import test from "node:test";
import { addDays, daysBetween, festDate, scoreItem, todayIST } from "./priority";

const T = "2026-11-01";
const base = { stage: "requirements_received", due: null, target: null, fest: null, lastTouchedAt: "2026-10-31T10:00:00Z", value: 0 };

test("date helpers", () => {
  assert.equal(daysBetween("2026-11-01", "2026-11-04"), 3);
  assert.equal(daysBetween("2026-11-04", "2026-11-01"), -3);
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(festDate({ festStart: null, festMonth: 1, festYear: 2027 }), "2027-02-01");
  assert.equal(festDate({ festStart: "2027-02-14", festMonth: 1, festYear: 2027 }), "2027-02-14");
  assert.equal(festDate({ festStart: null, festMonth: null, festYear: 2027 }), null);
  // 20:00 UTC on 31 Oct is already 1 Nov in India
  assert.equal(todayIST(new Date("2026-10-31T20:00:00Z")), "2026-11-01");
});

test("stages alone never make anything overdue", () => {
  const s = scoreItem({ ...base, stage: "reach_out" }, T);
  assert.equal(s.group, "later");
  assert.equal(s.score, 0);
  assert.deepEqual(s.reasons, []);
});

test("next step due date drives urgency and grouping", () => {
  const over = scoreItem({ ...base, due: "2026-10-29" }, T);
  assert.equal(over.group, "overdue");
  assert.equal(over.reasons[0], "Step overdue 3 days");
  assert.equal(scoreItem({ ...base, due: T }, T).group, "today");
  assert.equal(scoreItem({ ...base, due: "2026-11-05" }, T).group, "week");
  assert.equal(scoreItem({ ...base, due: "2026-12-05" }, T).group, "later");
});

test("target date counts on its own and the earlier date wins the group", () => {
  const passed = scoreItem({ ...base, target: "2026-10-30" }, T);
  assert.equal(passed.group, "overdue");
  assert.equal(passed.level, "high");
  assert.equal(passed.reasons[0], "Target passed 2 days ago");
  assert.equal(scoreItem({ ...base, target: "2026-11-06" }, T).reasons[0], "Target in 5 days");
  const both = scoreItem({ ...base, due: "2026-11-20", target: T }, T);
  assert.equal(both.group, "today");
});

test("near fests at an early stage, quiet deals and big deals rise", () => {
  const s = scoreItem({ ...base, stage: "reach_out", fest: "2026-11-10" }, T);
  assert.deepEqual(s.reasons, ["Fest in 9 days", "Still at Reach Out"]);
  assert.equal(s.level, "high");
  assert.equal(scoreItem({ ...base, stage: "reach_out", fest: "2026-11-10", due: "2026-10-30" }, T).level, "urgent");
  assert.ok(scoreItem({ ...base, lastTouchedAt: "2026-10-01T00:00:00Z" }, T).reasons.includes("No update in 31 days"));
  assert.ok(scoreItem({ ...base, value: 2_500_000 }, T).reasons.includes("₹20L+ deal"));
  assert.equal(scoreItem({ ...base, fest: "2026-10-01" }, T).reasons[0], "Fest date has passed: update it");
});
