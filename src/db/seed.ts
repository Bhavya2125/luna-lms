/**
 * Demo data for local development: `npm run db:seed`.
 * Creates four demo accounts (one per role plus a second executive) that all use SEED_PASSWORD from .env.local.
 * Refuses to run against a production database.
 */
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { getDb, schema } from "./connect";
import { collegeKey, nameKey, normPhone } from "../lib/format";

loadEnvConfig(process.cwd()); // read .env.local like the app does

const s = schema;

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "1") {
    throw new Error("Refusing to seed a production database");
  }
  const password = process.env.SEED_PASSWORD ?? "lunawave-dev-1";
  const hash = await bcrypt.hash(password, 10);
  const db = await getDb();

  const existing = await db.select({ id: s.users.id }).from(s.users).limit(1);
  if (existing.length) {
    console.log("Database already has users; skipping seed.");
    return;
  }

  const [aarav, isha, rohan, meera] = await db
    .insert(s.users)
    .values([
      { name: "Aarav Mehta", username: "aarav", passwordHash: hash, role: "super_admin" },
      { name: "Isha Kapoor", username: "isha", passwordHash: hash, role: "admin" },
      { name: "Rohan Verma", username: "rohan", passwordHash: hash, role: "executive" },
      { name: "Meera Joshi", username: "meera", passwordHash: hash, role: "executive" },
    ])
    .returning();

  const now = new Date();
  const yr = (m: number) => (m >= now.getMonth() ? now.getFullYear() : now.getFullYear() + 1);
  type C = { name: string; city: string; state: string; fest: string; m: number; days: number; type?: "cultural" | "technical" | "other"; assign: number[]; stage?: (typeof s.collegeStageEnum.enumValues)[number]; ab?: number; pb?: number; touched?: boolean };
  const list: C[] = [
    { name: "IIT Bombay", city: "Mumbai", state: "Maharashtra", fest: "Mood Indigo", m: 11, days: 4, assign: [rohan.id] },
    { name: "Delhi University – SRCC", city: "Delhi", state: "Delhi", fest: "Crossroads", m: 1, days: 3, assign: [rohan.id, meera.id], stage: "requirements_received", ab: 1_500_000, pb: 800_000, touched: true },
    { name: "BITS Pilani", city: "Pilani", state: "Rajasthan", fest: "Oasis", m: 10, days: 4, assign: [meera.id] },
    { name: "MNIT Jaipur", city: "Jaipur", state: "Rajasthan", fest: "Blitzschlag", m: 2, days: 3, assign: [rohan.id], stage: "initial_connect", touched: true },
    { name: "Christ University", city: "Bengaluru", state: "Karnataka", fest: "Blossoms", m: 1, days: 2, assign: [] },
    { name: "IIM Ahmedabad", city: "Ahmedabad", state: "Gujarat", fest: "Chaos", m: 2, days: 2, type: "other", assign: [meera.id], stage: "rates_proposed", ab: 600_000, pb: 300_000 },
    { name: "NIT Trichy", city: "Tiruchirappalli", state: "Tamil Nadu", fest: "Festember", m: 9, days: 3, assign: [rohan.id], stage: "locked", ab: 2_000_000, pb: 1_200_000, touched: true },
    { name: "Symbiosis Pune", city: "Pune", state: "Maharashtra", fest: "Symbhav", m: 1, days: 1, assign: [] },
    { name: "LNMIIT Jaipur", city: "Jaipur", state: "Rajasthan", fest: "Moksha", m: 2, days: 2, type: "technical", assign: [rohan.id] },
    { name: "VIT Vellore", city: "Vellore", state: "Tamil Nadu", fest: "Vibrance", m: 2, days: 3, assign: [] },
  ];
  const col: Record<string, number> = {};
  for (const c of list) {
    const [row] = await db
      .insert(s.colleges)
      .values({
        name: c.name,
        city: c.city,
        state: c.state,
        nameKey: collegeKey(c.name, c.city),
        festName: c.fest,
        festType: c.type ?? "cultural",
        festMonth: c.m,
        festYear: yr(c.m),
        days: c.days,
        stage: c.stage ?? "reach_out",
        artistBudget: c.ab ?? 0,
        prodBudget: c.pb ?? 0,
        proposedArtistRate: c.stage === "rates_proposed" || c.stage === "locked" ? (c.ab ?? 0) : 0,
        dealAmount: c.stage === "locked" ? 3_200_000 : 0,
        dealDeliverables: c.stage === "locked" ? "Headliner night, main stage, sound and lights" : "",
        convenorName: "Student convenor",
        convenorPhone: normPhone(`98999${String(10000 + list.indexOf(c)).slice(1)}0`.slice(0, 10)),
        lastTouchedAt: c.touched ? now : null,
        createdBy: aarav.id,
      })
      .returning({ id: s.colleges.id });
    col[c.name] = row.id;
    if (c.assign.length) await db.insert(s.collegeAssignments).values(c.assign.map((u) => ({ collegeId: row.id, userId: u })));
  }

  const co = async (name: string, category: string, contacts: { name: string; designation: string; phone: string }[]) => {
    const [row] = await db.insert(s.companies).values({ name, nameKey: nameKey(name), category }).returning({ id: s.companies.id });
    if (contacts.length) await db.insert(s.companyContacts).values(contacts.map((c) => ({ ...c, phone: normPhone(c.phone), companyId: row.id })));
    return row.id;
  };
  const redbull = await co("Red Bull", "Beverage", [
    { name: "Karan Shah", designation: "Marketing lead", phone: "98100 00001" },
    { name: "Neha Rao", designation: "Events and activations", phone: "98100 00002" },
  ]);
  const boat = await co("boAt", "Audio", [{ name: "Dev Malhotra", designation: "Brand partnerships", phone: "98100 00003" }]);
  const pepsi = await co("Pepsi", "Beverage", []);
  const tinder = await co("Tinder", "Dating app", []);

  const prevYear = now.getFullYear() - 1;
  const years = [
    ["IIT Bombay", "Self-managed"],
    ["Delhi University – SRCC", "Agency X"],
    ["BITS Pilani", "Agency X"],
    ["MNIT Jaipur", "Self-managed"],
    ["NIT Trichy", "Agency X"],
    ["IIM Ahmedabad", "Self-managed"],
    ["VIT Vellore", "Agency X"],
  ] as const;
  for (const [n, agency] of years) {
    const c = list.find((x) => x.name === n)!;
    await db.insert(s.collegeYears).values({ collegeId: col[n], year: prevYear, agency, eventMonth: c.m, days: c.days });
  }
  const sp = (n: string, company: number, title: string, amount: number, deliverables: string, exclusive = false, eventMonth: number | null = null) =>
    db.insert(s.collegeSponsorships).values({ collegeId: col[n], companyId: company, year: prevYear, title, amount, deliverables, exclusive, eventMonth });
  await sp("IIT Bombay", redbull, "Title sponsor", 600_000, "Stage branding, banners", true, 11);
  await sp("IIT Bombay", tinder, "Associate sponsor", 250_000, "Stall");
  await sp("Delhi University – SRCC", boat, "Title sponsor", 600_000, "Stage branding, banners");
  await sp("Delhi University – SRCC", pepsi, "Associate sponsor", 250_000, "Stall");
  await sp("BITS Pilani", redbull, "Title sponsor", 600_000, "Stage branding, banners");
  await sp("MNIT Jaipur", boat, "Title sponsor", 600_000, "Stage branding, banners");
  await sp("IIM Ahmedabad", pepsi, "Title sponsor", 600_000, "Stage branding, banners");
  await sp("NIT Trichy", redbull, "Title sponsor", 600_000, "Stage branding, banners");
  await sp("VIT Vellore", redbull, "Title sponsor", 600_000, "Stage branding, banners");
  await sp("VIT Vellore", boat, "Associate sponsor", 250_000, "Stall");

  const artistRows = await db
    .insert(s.artists)
    .values([
      { name: "Divine", nameKey: nameKey("Divine"), stageName: "DIVINE", genre: "Hip-Hop", lastRate: 1_800_000, crewCount: 8, riderNotes: "Backline: 2 wireless mics, 1 DI box, monitors x4.\nGreen room with water and towels.\nSound check 90 minutes before set." },
      { name: "Zakir Khan", nameKey: nameKey("Zakir Khan"), stageName: "Zakir Khan", genre: "Stand-up", lastRate: 1_200_000, crewCount: 6 },
      { name: "Prateek Kuhad", nameKey: nameKey("Prateek Kuhad"), stageName: "Prateek Kuhad", genre: "Indie", lastRate: 1_500_000, crewCount: 10 },
      { name: "Neha Kakkar", nameKey: nameKey("Neha Kakkar"), stageName: "Neha Kakkar", genre: "Bollywood", lastRate: 2_500_000, crewCount: 18 },
    ])
    .returning();
  await db.insert(s.artistContacts).values([
    { artistId: artistRows[0].id, name: "Divine’s manager", designation: "Manager", phone: normPhone("98200 11111") },
    { artistId: artistRows[0].id, name: "Tour desk", designation: "Logistics", phone: normPhone("98200 99999") },
    { artistId: artistRows[1].id, name: "Zakir’s manager", designation: "Manager", phone: normPhone("98200 22222") },
    { artistId: artistRows[2].id, name: "Management", designation: "Manager", phone: normPhone("98200 33333") },
    { artistId: artistRows[3].id, name: "Management", designation: "Manager", phone: normPhone("98200 44444") },
  ]);
  await db.insert(s.artistManualShows).values([
    { artistId: artistRows[0].id, collegeName: "IIM Indore", year: prevYear - 1, eventMonth: 10, amount: 1_500_000, travel: "extra", travelExtra: 150_000, notes: "Closing night" },
  ]);
  const ae = (n: string, a: (typeof artistRows)[number], day: number, amount: number, travel: "included" | "extra" | "unknown" = "unknown", extra = 0) =>
    db.insert(s.collegeArtistEntries).values({ collegeId: col[n], year: prevYear, artistId: a.id, artistName: a.name, genre: a.genre, day, amount, travel, travelExtra: extra });
  await ae("IIT Bombay", artistRows[0], 1, 1_250_000, "extra", 120_000);
  await ae("IIT Bombay", artistRows[2], 2, 1_250_000, "included");
  await ae("Delhi University – SRCC", artistRows[1], 1, 900_000);
  await db.insert(s.collegeProductionEntries).values([
    { collegeId: col["IIT Bombay"], year: prevYear, kind: "total", amount: 1_200_000, travel: "included" },
    { collegeId: col["Delhi University – SRCC"], year: prevYear, day: 1, vendor: "Production vendor", scope: "Stage and sound", amount: 300_000 },
    { collegeId: col["Delhi University – SRCC"], year: prevYear, day: 2, vendor: "Production vendor", scope: "Stage and sound", amount: 350_000 },
  ]);

  const [deal] = await db
    .insert(s.sponsorDeals)
    .values({ companyId: redbull, year: now.getFullYear() + 1, stage: "requirements_received", amount: 800_000, deliverables: "Stall, banner", contactName: "Karan Shah", contactPhone: normPhone("98100 00001"), notes: "Asked for a deck covering 3 fests.", createdBy: isha.id })
    .returning({ id: s.sponsorDeals.id });
  await db.insert(s.sponsorDealLog).values([
    { dealId: deal.id, fromStage: "new", toStage: "reach_out", byUserId: isha.id },
    { dealId: deal.id, fromStage: "reach_out", toStage: "initial_connect", byUserId: isha.id },
    { dealId: deal.id, fromStage: "initial_connect", toStage: "requirements_received", byUserId: isha.id },
  ]);

  console.log("Seeded demo data. Sign in as aarav (Super Admin), isha (Admin), rohan or meera (Executives) with SEED_PASSWORD.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
