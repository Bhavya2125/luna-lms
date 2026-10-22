import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { schema } from "@/db";
import { api, HttpError, isAdmin, readJson } from "@/lib/api";
import { nameKey, normPhone } from "@/lib/format";
import { assignedCollegeIds, dealScope } from "@/lib/queries";
import { companyUpdate } from "@/lib/validators";

const { companies, companyContacts, collegeSponsorships, colleges, sponsorDeals, sponsorDealLog, users } = schema;

export const GET = api<{ id: string }>(async ({ db, user, params }) => {
  const id = Number(params.id);
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  if (!company) throw new HttpError(404, "Company not found");
  const admin = isAdmin(user.role);
  const assigned = admin ? [] : await assignedCollegeIds(db, user.id);
  const contacts = await db.select().from(companyContacts).where(eq(companyContacts.companyId, id)).orderBy(asc(companyContacts.id));
  const sponsorships = await db
    .select({
      id: collegeSponsorships.id,
      collegeId: collegeSponsorships.collegeId,
      college: colleges.name,
      city: colleges.city,
      festName: colleges.festName,
      year: collegeSponsorships.year,
      title: collegeSponsorships.title,
      amount: collegeSponsorships.amount,
      deliverables: collegeSponsorships.deliverables,
      exclusive: collegeSponsorships.exclusive,
      eventMonth: collegeSponsorships.eventMonth,
      eventDate: collegeSponsorships.eventDate,
      notes: collegeSponsorships.notes,
    })
    .from(collegeSponsorships)
    .innerJoin(colleges, eq(colleges.id, collegeSponsorships.collegeId))
    .where(and(eq(collegeSponsorships.companyId, id), admin ? undefined : assigned.length ? inArray(collegeSponsorships.collegeId, assigned) : eq(collegeSponsorships.id, -1)))
    .orderBy(desc(collegeSponsorships.year));
  const deals = await db
    .select({ deal: sponsorDeals, college: colleges.name, by: users.name })
    .from(sponsorDeals)
    .leftJoin(colleges, eq(colleges.id, sponsorDeals.collegeId))
    .leftJoin(users, eq(users.id, sponsorDeals.createdBy))
    .where(and(eq(sponsorDeals.companyId, id), dealScope(user, assigned)))
    .orderBy(desc(sponsorDeals.updatedAt));
  const ids = deals.map((d) => d.deal.id);
  const logs = ids.length
    ? await db
        .select({ dealId: sponsorDealLog.dealId, from: sponsorDealLog.fromStage, to: sponsorDealLog.toStage, reason: sponsorDealLog.reason, at: sponsorDealLog.at, by: users.name })
        .from(sponsorDealLog)
        .leftJoin(users, eq(users.id, sponsorDealLog.byUserId))
        .where(inArray(sponsorDealLog.dealId, ids))
        .orderBy(desc(sponsorDealLog.at), desc(sponsorDealLog.id))
    : [];
  return {
    company,
    contacts,
    sponsorships,
    deals: deals.map((d) => ({ ...d.deal, college: d.college, by: d.by, log: logs.filter((l) => l.dealId === d.deal.id) })),
  };
});

export const PATCH = api<{ id: string }>(async ({ req, db, params }) => {
  const id = Number(params.id);
  const b = companyUpdate.parse(await readJson(req));
  await db.transaction(async (tx) => {
    const patch: Partial<typeof companies.$inferInsert> = {};
    if (b.name !== undefined) {
      patch.name = b.name;
      patch.nameKey = nameKey(b.name);
    }
    if (b.category !== undefined) patch.category = b.category;
    if (b.notes !== undefined) patch.notes = b.notes;
    if (Object.keys(patch).length) await tx.update(companies).set(patch).where(eq(companies.id, id));
    if (b.contacts) {
      await tx.delete(companyContacts).where(eq(companyContacts.companyId, id));
      const cs = b.contacts.filter((c) => c.name || c.phone).map((c) => ({ ...c, phone: normPhone(c.phone), companyId: id }));
      if (cs.length) await tx.insert(companyContacts).values(cs);
    }
  });
  return { ok: true };
});
