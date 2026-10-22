import { COLLEGE_STAGES, DEAL_STAGES, STAGE_LABEL, type Role } from "./stages";

const isAdmin = (r: Role) => r === "admin" || r === "super_admin";

type Stages = readonly string[];

function direction(stages: Stages, from: string, to: string, role: Role): string | null {
  if (from === to) return "Already at this stage";
  const f = stages.indexOf(from);
  const t = stages.indexOf(to);
  if (f < 0 || t < 0) return "Unknown stage";
  if (!isAdmin(role)) {
    if (from === "locked" || from === "lost") return "Only an admin can reopen a closed deal";
    if (t < f) return "Only an admin can move a deal backward";
  }
  return null;
}

export type CollegeDealState = {
  stage: string;
  proposedArtistRate: number;
  proposedProdRate: number;
  dealAmount: number;
  dealDeliverables: string;
};

/** Returns an error message, or null when the move is allowed. `next` is the state after applying any fields sent with the move. */
export function checkCollegeMove(role: Role, from: string, to: string, next: CollegeDealState, reason?: string): string | null {
  const dir = direction(COLLEGE_STAGES, from, to, role);
  if (dir) return dir;
  if (to === "rates_proposed" && !(next.proposedArtistRate > 0 || next.proposedProdRate > 0)) {
    return "Record the proposed artist or production rate before moving to Rates Proposed";
  }
  if (to === "locked" && !(next.dealAmount > 0 && next.dealDeliverables.trim())) {
    return "Enter the final amount and deliverables before locking";
  }
  if (to === "lost" && !(reason ?? "").trim()) return "Choose why the deal was lost";
  return null;
}

export type SponsorDealState = { stage: string; amount: number; deliverables: string };

export function checkDealMove(role: Role, from: string, to: string, next: SponsorDealState, reason?: string): string | null {
  const dir = direction(DEAL_STAGES, from, to, role);
  if (dir) return dir;
  if (to === "proposal_sent" && !(next.amount > 0)) return "Enter the quoted amount before moving to Proposal Sent";
  if (to === "locked" && !(next.amount > 0 && next.deliverables.trim())) {
    return "Enter the final amount and deliverables before locking";
  }
  if (to === "lost" && !(reason ?? "").trim()) return "Choose why the deal was lost";
  return null;
}

export const stageName = (s: string) => STAGE_LABEL[s] ?? s;
