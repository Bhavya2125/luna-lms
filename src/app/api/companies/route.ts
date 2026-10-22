import { asc, desc, eq, inArray } from "drizzle-orm";
import { schema } from "@/db";
import { api, isAdmin, readJson } from "@/lib/api";
import { nameKey, normPhone } from "@/lib/format";
import { assignedCollegeIds, dealScope } from "@/lib/queries";
import { companyCreate } from "@/lib/validators";

const { companies, companyContacts, collegeSponsorships, sponsorDeals } = schema;

export const GET = api(async ({ db, user }) => {
  const admin = isAdmin(user.role);
  const assigned = admin ? [] : await assignedCollegeIds(db, user.id);
  const list = await db.select().from(companies).orderBy(asc(companies.name));
  const contacts = await db.select().from(companyContacts);
  const spRows = await db
    .select({
      companyId: collegeSponsorships.companyId,
      collegeId: collegeSponsorships.collegeId,
      year: collegeSponsorships.year,
      amount: collegeSponsorships.amount,
      exclusive: collegeSponsorships.exclusive,
    })
    .from(collegeSponsorships)
    .where(admin ? undefined : assigned.length ? inArray(collegeSponsorships.collegeId, assigned) : eq(collegeSponsorships.id, -1));
  const deals = await db.select().from(sponsorDeals).where(dealScope(user, assigned)).orderBy(desc(sponsorDeals.updatedAt));
  return list.map((c) => {
    const sp = spRows.filter((r) => r.companyId === c.id);
    const ds = deals.filter((d) => d.companyId === c.id);
    const cs = contacts.filter((x) => x.companyId === c.id);
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      colleges: new Set(sp.map((r) => r.collegeId)).size,
      total: sp.reduce((s, r) => s + r.amount, 0),
      years: [...new Set(sp.map((r) => r.year))].sort((a, b) => b - a),
      exclusive: sp.some((r) => r.exclusive) || ds.some((d) => d.exclusive),
      contacts: cs.length,
      primaryPhone: cs.find((x) => x.phone)?.phone ?? "",
      latestStage: ds[0]?.stage ?? null,
      deals: ds.length,
    };
  });
});

export const POST = api(async ({ req, db }) => {
  const b = companyCreate.parse(await readJson(req));
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(companies)
      .values({ name: b.name, nameKey: nameKey(b.name), category: b.category, notes: b.notes })
      .returning({ id: companies.id });
    const cs = b.contacts.filter((c) => c.name || c.phone).map((c) => ({ ...c, phone: normPhone(c.phone), companyId: row.id }));
    if (cs.length) await tx.insert(companyContacts).values(cs);
    return row.id;
  });
  return { id };
});
