import type { Role } from "./stages";

export type Me = { id: number; name: string; username: string; role: Role };
export type Person = { id: number; name: string };

export type College = {
  id: number;
  name: string;
  city: string;
  state: string;
  festName: string;
  festType: "cultural" | "technical" | "other";
  festMonth: number;
  festYear: number;
  festStart: string | null;
  festEnd: string | null;
  days: number;
  stage: string;
  lostReason: string;
  convenorName: string;
  convenorPhone: string;
  facultyName: string;
  facultyPhone: string;
  artistBudget: number;
  prodBudget: number;
  wishlist: string;
  scopeNotes: string;
  proposedArtistRate: number;
  proposedProdRate: number;
  proposalNotes: string;
  dealAmount: number;
  dealDeliverables: string;
  pitchCompany: string;
  lastTouchedAt: string | null;
};
export type CollegeRow = College & { assignees: Person[]; previousAgency: string };

export type StageLog = { id: number; from: string; to: string; reason: string; at: string; by: string | null };
export type Note = { id: number; text: string; at: string; by: string | null };
export type Travel = "included" | "extra" | "unknown";
export type YearRow = { id: number; year: number; agency: string; eventMonth: number | null; startDate: string | null; endDate: string | null; days: number };
export type SponsorRow = {
  id: number;
  companyId: number;
  brand: string;
  year: number;
  title: string;
  amount: number;
  deliverables: string;
  exclusive: boolean;
  eventMonth: number | null;
  eventDate: string | null;
  notes: string;
};
export type ArtistEntry = {
  id: number;
  year: number;
  kind: "item" | "total";
  artistId: number | null;
  artistName: string;
  genre: string;
  day: number;
  amount: number;
  travel: Travel;
  travelExtra: number;
  notes: string;
};
export type ProdEntry = {
  id: number;
  year: number;
  kind: "item" | "total";
  vendor: string;
  scope: string;
  day: number;
  amount: number;
  travel: Travel;
  travelExtra: number;
  notes: string;
};
export type CollegeDetail = {
  college: College;
  assignees: Person[];
  notes: Note[];
  log: StageLog[];
  years: YearRow[];
  sponsors: SponsorRow[];
  artistEntries: ArtistEntry[];
  productionEntries: ProdEntry[];
};

export type Contact = { id?: number; name: string; designation: string; phone: string };
export type CompanyRow = {
  id: number;
  name: string;
  category: string;
  colleges: number;
  total: number;
  years: number[];
  exclusive: boolean;
  contacts: number;
  primaryPhone: string;
  latestStage: string | null;
  deals: number;
};
export type Deal = {
  id: number;
  companyId: number;
  collegeId: number | null;
  year: number | null;
  stage: string;
  amount: number;
  deliverables: string;
  contactName: string;
  contactPhone: string;
  exclusive: boolean;
  lostReason: string;
  notes: string;
  createdBy: number | null;
  updatedAt: string;
  company?: string;
  college?: string | null;
};
export type DealDetail = Deal & { by: string | null; log: { from: string; to: string; reason: string; at: string; by: string | null }[] };
export type CompanyDetail = {
  company: { id: number; name: string; category: string; notes: string };
  contacts: Contact[];
  sponsorships: {
    id: number;
    collegeId: number;
    college: string;
    city: string;
    festName: string;
    year: number;
    title: string;
    amount: number;
    deliverables: string;
    exclusive: boolean;
    eventMonth: number | null;
    eventDate: string | null;
    notes: string;
  }[];
  deals: DealDetail[];
};

export type ArtistRow = {
  id: number;
  name: string;
  stageName: string;
  genre: string;
  crewCount: number;
  riderNotes: string;
  techRiderUrl: string;
  hospitalityRiderUrl: string;
  shows: number;
  lastRate: number | null;
  contacts: Contact[] | null;
};
export type ArtistDetail = {
  artist: ArtistRow & { lastRate: number | null };
  contacts: Contact[] | null;
  history: { id: number; collegeId: number; college: string; year: number; day: number; amount: number | null; travel: Travel; travelExtra: number | null; notes: string }[];
  manual: { id: number; collegeName: string; year: number; eventMonth: number | null; eventDate: string | null; amount: number | null; travel: Travel; travelExtra: number | null; notes: string }[];
};

export type TeamUser = { id: number; name: string; username: string; role: Role; active: boolean; colleges: number };
export type AlertItem = { collegeId: number; college: string; festYear: number; kind: "check" | "advance"; message: string; daysUntil: number };
