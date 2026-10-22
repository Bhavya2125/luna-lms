import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["executive", "admin", "super_admin"]);
export const collegeStageEnum = pgEnum("college_stage", [
  "reach_out",
  "initial_connect",
  "requirements_received",
  "rates_proposed",
  "locked",
  "lost",
]);
export const dealStageEnum = pgEnum("deal_stage", [
  "reach_out",
  "initial_connect",
  "requirements_received",
  "proposal_sent",
  "locked",
  "lost",
]);
export const travelEnum = pgEnum("travel_stay", ["included", "extra", "unknown"]);
export const festTypeEnum = pgEnum("fest_type", ["cultural", "technical", "other"]);
export const entryKindEnum = pgEnum("entry_kind", ["item", "total"]);

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const money = (name: string) => bigint(name, { mode: "number" });

/* ---------- accounts ---------- */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("executive"),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the cookie token
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetUserId: integer("target_user_id").references(() => users.id, { onDelete: "set null" }),
  detail: jsonb("detail"),
  at: ts("at").notNull().defaultNow(),
});

/* ---------- colleges ---------- */
export const colleges = pgTable(
  "colleges",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull().default(""),
    nameKey: text("name_key").notNull(),
    festName: text("fest_name").notNull().default(""),
    festType: festTypeEnum("fest_type").notNull().default("cultural"),
    festMonth: smallint("fest_month").notNull(), // 0-11
    festYear: smallint("fest_year").notNull(),
    festStart: date("fest_start", { mode: "string" }),
    festEnd: date("fest_end", { mode: "string" }),
    days: smallint("days").notNull().default(2),
    stage: collegeStageEnum("stage").notNull().default("reach_out"),
    lostReason: text("lost_reason").notNull().default(""),
    convenorName: text("convenor_name").notNull().default(""),
    convenorPhone: text("convenor_phone").notNull().default(""),
    facultyName: text("faculty_name").notNull().default(""),
    facultyPhone: text("faculty_phone").notNull().default(""),
    artistBudget: money("artist_budget").notNull().default(0),
    prodBudget: money("prod_budget").notNull().default(0),
    wishlist: text("wishlist").notNull().default(""),
    scopeNotes: text("scope_notes").notNull().default(""),
    proposedArtistRate: money("proposed_artist_rate").notNull().default(0),
    proposedProdRate: money("proposed_prod_rate").notNull().default(0),
    proposalNotes: text("proposal_notes").notNull().default(""),
    dealAmount: money("deal_amount").notNull().default(0),
    dealDeliverables: text("deal_deliverables").notNull().default(""),
    pitchCompany: text("pitch_company").notNull().default(""), // the company name we pitch to this college under
    lastTouchedAt: ts("last_touched_at"),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("colleges_name_key_idx").on(t.nameKey), index("colleges_stage_idx").on(t.stage)],
);

export const collegeAssignments = pgTable(
  "college_assignments",
  {
    collegeId: integer("college_id")
      .notNull()
      .references(() => colleges.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.collegeId, t.userId] })],
);

export const collegeStageLog = pgTable("college_stage_log", {
  id: serial("id").primaryKey(),
  collegeId: integer("college_id")
    .notNull()
    .references(() => colleges.id, { onDelete: "cascade" }),
  fromStage: text("from_stage").notNull(),
  toStage: text("to_stage").notNull(),
  reason: text("reason").notNull().default(""),
  byUserId: integer("by_user_id").references(() => users.id, { onDelete: "set null" }),
  at: ts("at").notNull().defaultNow(),
});

export const collegeNotes = pgTable("college_notes", {
  id: serial("id").primaryKey(),
  collegeId: integer("college_id")
    .notNull()
    .references(() => colleges.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  byUserId: integer("by_user_id").references(() => users.id, { onDelete: "set null" }),
  at: ts("at").notNull().defaultNow(),
});

/* ---------- sponsor companies ---------- */
export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    category: text("category").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("companies_name_key_idx").on(t.nameKey)],
);

export const companyContacts = pgTable("company_contacts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  designation: text("designation").notNull().default(""),
  phone: text("phone").notNull().default(""),
});

/* ---------- artists ---------- */
export const artists = pgTable(
  "artists",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    stageName: text("stage_name").notNull().default(""),
    genre: text("genre").notNull().default(""),
    lastRate: money("last_rate").notNull().default(0),
    lastRateDate: date("last_rate_date", { mode: "string" }),
    crewCount: integer("crew_count").notNull().default(0),
    riderNotes: text("rider_notes").notNull().default(""),
    techRiderUrl: text("tech_rider_url").notNull().default(""),
    hospitalityRiderUrl: text("hospitality_rider_url").notNull().default(""),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("artists_name_key_idx").on(t.nameKey)],
);

export const artistContacts = pgTable("artist_contacts", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  designation: text("designation").notNull().default(""),
  phone: text("phone").notNull().default(""),
});

export const artistManualShows = pgTable("artist_manual_shows", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  collegeName: text("college_name").notNull(),
  year: smallint("year").notNull(),
  eventMonth: smallint("event_month"),
  eventDate: date("event_date", { mode: "string" }),
  amount: money("amount").notNull().default(0),
  travel: travelEnum("travel").notNull().default("unknown"),
  travelExtra: money("travel_extra").notNull().default(0),
  notes: text("notes").notNull().default(""),
});

/* ---------- college history ---------- */
export const collegeYears = pgTable(
  "college_years",
  {
    id: serial("id").primaryKey(),
    collegeId: integer("college_id")
      .notNull()
      .references(() => colleges.id, { onDelete: "cascade" }),
    year: smallint("year").notNull(),
    agency: text("agency").notNull().default(""),
    eventMonth: smallint("event_month"),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    days: smallint("days").notNull().default(2),
  },
  (t) => [uniqueIndex("college_years_uq").on(t.collegeId, t.year)],
);

export const collegeSponsorships = pgTable(
  "college_sponsorships",
  {
    id: serial("id").primaryKey(),
    collegeId: integer("college_id")
      .notNull()
      .references(() => colleges.id, { onDelete: "cascade" }),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    year: smallint("year").notNull(),
    title: text("title").notNull().default(""),
    amount: money("amount").notNull().default(0),
    deliverables: text("deliverables").notNull().default(""),
    exclusive: boolean("exclusive").notNull().default(false),
    eventMonth: smallint("event_month"),
    eventDate: date("event_date", { mode: "string" }),
    notes: text("notes").notNull().default(""),
  },
  (t) => [index("college_sponsorships_company_idx").on(t.companyId), index("college_sponsorships_college_idx").on(t.collegeId)],
);

export const collegeArtistEntries = pgTable(
  "college_artist_entries",
  {
    id: serial("id").primaryKey(),
    collegeId: integer("college_id")
      .notNull()
      .references(() => colleges.id, { onDelete: "cascade" }),
    year: smallint("year").notNull(),
    kind: entryKindEnum("kind").notNull().default("item"),
    artistId: integer("artist_id").references(() => artists.id, { onDelete: "set null" }),
    artistName: text("artist_name").notNull().default(""),
    genre: text("genre").notNull().default(""),
    day: smallint("day").notNull().default(0),
    amount: money("amount").notNull().default(0),
    travel: travelEnum("travel").notNull().default("unknown"),
    travelExtra: money("travel_extra").notNull().default(0),
    notes: text("notes").notNull().default(""),
  },
  (t) => [index("college_artist_entries_artist_idx").on(t.artistId), index("college_artist_entries_college_idx").on(t.collegeId)],
);

export const collegeProductionEntries = pgTable(
  "college_production_entries",
  {
    id: serial("id").primaryKey(),
    collegeId: integer("college_id")
      .notNull()
      .references(() => colleges.id, { onDelete: "cascade" }),
    year: smallint("year").notNull(),
    kind: entryKindEnum("kind").notNull().default("item"),
    vendor: text("vendor").notNull().default(""),
    scope: text("scope").notNull().default(""),
    day: smallint("day").notNull().default(0),
    amount: money("amount").notNull().default(0),
    travel: travelEnum("travel").notNull().default("unknown"),
    travelExtra: money("travel_extra").notNull().default(0),
    notes: text("notes").notNull().default(""),
  },
  (t) => [index("college_production_entries_college_idx").on(t.collegeId)],
);

/* ---------- sponsor deals (one pipeline per college) ---------- */
export const sponsorDeals = pgTable(
  "sponsor_deals",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    collegeId: integer("college_id").references(() => colleges.id, { onDelete: "cascade" }), // null = overall
    year: smallint("year"),
    stage: dealStageEnum("stage").notNull().default("reach_out"),
    amount: money("amount").notNull().default(0),
    deliverables: text("deliverables").notNull().default(""),
    contactName: text("contact_name").notNull().default(""),
    contactPhone: text("contact_phone").notNull().default(""),
    exclusive: boolean("exclusive").notNull().default(false),
    lostReason: text("lost_reason").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("sponsor_deals_company_idx").on(t.companyId), index("sponsor_deals_college_idx").on(t.collegeId)],
);

export const sponsorDealLog = pgTable("sponsor_deal_log", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id")
    .notNull()
    .references(() => sponsorDeals.id, { onDelete: "cascade" }),
  fromStage: text("from_stage").notNull(),
  toStage: text("to_stage").notNull(),
  reason: text("reason").notNull().default(""),
  byUserId: integer("by_user_id").references(() => users.id, { onDelete: "set null" }),
  at: ts("at").notNull().defaultNow(),
});

/* ---------- push ---------- */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const alertDispatch = pgTable(
  "alert_dispatch",
  {
    collegeId: integer("college_id")
      .notNull()
      .references(() => colleges.id, { onDelete: "cascade" }),
    festYear: smallint("fest_year").notNull(),
    kind: text("kind").notNull(),
    sentAt: ts("sent_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.collegeId, t.festYear, t.kind] })],
);
