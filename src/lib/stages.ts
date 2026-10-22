export const COLLEGE_STAGES = [
  "reach_out",
  "initial_connect",
  "requirements_received",
  "rates_proposed",
  "locked",
  "lost",
] as const;
export type CollegeStage = (typeof COLLEGE_STAGES)[number];

export const DEAL_STAGES = [
  "reach_out",
  "initial_connect",
  "requirements_received",
  "proposal_sent",
  "locked",
  "lost",
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export const STAGE_LABEL: Record<string, string> = {
  reach_out: "Reach Out",
  initial_connect: "Initial Connect",
  requirements_received: "Requirements Received",
  rates_proposed: "Rates Proposed",
  proposal_sent: "Proposal Sent",
  locked: "Locked",
  lost: "Lost",
};

export const COLLEGE_STAGE_DESC: Record<CollegeStage, string> = {
  reach_out: "First touchpoint. WhatsApp or call the student convenor.",
  initial_connect: "Confirm fest dates, number of days and month. Add convenor and faculty contacts.",
  requirements_received: "Capture total artist budget, production budget, wishlist and scope.",
  rates_proposed: "Record the artist and production rates you proposed, and send the curated roster and package.",
  locked: "Deal closed. The fest is confirmed with us. Needs the final amount and deliverables.",
  lost: "Deal lost. The reason is recorded.",
};

export const DEAL_STAGE_DESC: Record<DealStage, string> = {
  reach_out: "First contact with the brand team. Log who you spoke to.",
  initial_connect: "Understand their category, past sponsorships and which fests interest them.",
  requirements_received: "Capture budget, deliverables, target colleges and any exclusivity they need.",
  proposal_sent: "Send the sponsorship deck with fest-wise pricing. Needs the quoted amount.",
  locked: "Sponsorship confirmed. Needs the final amount and deliverables.",
  lost: "Sponsorship lost. The reason is recorded.",
};

export const LOST_REASONS = ["Budget gap", "Dates clashed", "Went with competitor", "No response", "Other"];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const ROLES = ["executive", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<Role, string> = {
  executive: "Executive",
  admin: "Admin",
  super_admin: "Super Admin",
};
export const ROLE_DESC: Record<Role, string> = {
  executive: "Sees only the colleges assigned to them. Artist contacts and fees stay locked. Can move deals forward only.",
  admin: "Sees all colleges, unlocks artist contacts and fees, assigns colleges, imports CSVs and can move deals backward.",
  super_admin: "Everything an Admin can do, plus creating accounts and managing access.",
};

export const GENRES = ["Bollywood", "Indie", "Hip-Hop", "Stand-up", "EDM / DJ", "Rock", "Folk", "Other"];
export const FEST_TYPES = ["cultural", "technical", "other"] as const;
export const TRAVEL = ["included", "extra", "unknown"] as const;
