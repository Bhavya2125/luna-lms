import assert from "node:assert/strict";
import test from "node:test";
import { checkCollegeMove, checkDealMove } from "./rules";
import { normPhone, collegeKey, inr } from "./format";

const base = { stage: "reach_out", proposedArtistRate: 0, proposedProdRate: 0, dealAmount: 0, dealDeliverables: "" };

test("college: executives can only move forward", () => {
  assert.equal(checkCollegeMove("executive", "reach_out", "initial_connect", base), null);
  assert.match(checkCollegeMove("executive", "initial_connect", "reach_out", base) ?? "", /admin/);
  assert.match(checkCollegeMove("executive", "locked", "rates_proposed", { ...base, proposedArtistRate: 1 }) ?? "", /reopen/);
  assert.equal(checkCollegeMove("admin", "initial_connect", "reach_out", base), null);
  assert.equal(checkCollegeMove("super_admin", "lost", "initial_connect", base), null);
});

test("college: rates, lock and lost need their details", () => {
  assert.match(checkCollegeMove("admin", "requirements_received", "rates_proposed", base) ?? "", /rate/i);
  assert.equal(checkCollegeMove("admin", "requirements_received", "rates_proposed", { ...base, proposedProdRate: 5 }), null);
  assert.match(checkCollegeMove("admin", "rates_proposed", "locked", { ...base, dealAmount: 100 }) ?? "", /amount and deliverables/);
  assert.match(checkCollegeMove("admin", "rates_proposed", "locked", { ...base, dealDeliverables: "x" }) ?? "", /amount and deliverables/);
  assert.equal(checkCollegeMove("admin", "rates_proposed", "locked", { ...base, dealAmount: 100, dealDeliverables: "Stage" }), null);
  assert.match(checkCollegeMove("admin", "rates_proposed", "lost", base) ?? "", /lost/);
  assert.equal(checkCollegeMove("admin", "rates_proposed", "lost", base, "Budget gap"), null);
  assert.match(checkCollegeMove("admin", "reach_out", "reach_out", base) ?? "", /Already/);
});

test("sponsor deals follow the same rules", () => {
  const d = { stage: "reach_out", amount: 0, deliverables: "" };
  assert.match(checkDealMove("executive", "initial_connect", "proposal_sent", d) ?? "", /quoted amount/);
  assert.equal(checkDealMove("executive", "initial_connect", "proposal_sent", { ...d, amount: 5 }), null);
  assert.match(checkDealMove("executive", "proposal_sent", "locked", { ...d, amount: 5 }) ?? "", /deliverables/);
  assert.match(checkDealMove("executive", "proposal_sent", "initial_connect", { ...d, amount: 5 }) ?? "", /admin/);
  assert.equal(checkDealMove("admin", "locked", "reach_out", d), null);
});

test("phone numbers and keys", () => {
  assert.equal(normPhone("98765 43210"), "919876543210");
  assert.equal(normPhone("+91 98765 43210"), "919876543210");
  assert.equal(normPhone("+44 7700 900123"), "447700900123");
  assert.equal(normPhone("09876543210"), "919876543210");
  assert.equal(normPhone(""), "");
  assert.equal(collegeKey("IIT  Bombay", "Mumbai"), collegeKey("iit bombay", "MUMBAI"));
  assert.equal(inr(1_500_000), "₹15L");
  assert.equal(inr(24_000_000), "₹2.4Cr");
  assert.equal(inr(0), "—");
});
