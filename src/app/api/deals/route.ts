import { and, desc, eq } from "drizzle-orm";
import { schema } from "@/db";
import { api, HttpError, isAdmin, readJson } from "@/lib/api";
import { normPhone } from "@/lib/format";
import { assignedCollegeIds, dealScope } from "@/lib/queries";
import { checkDealMove } from "@/lib/rules";
import { dealCreate } from "@/lib/validators";

const { sponsorDeals, sponsorDealLog, companies, colleges, companyContacts } = schema;

export const GET = api(async ({ db, user }) => {
  const assigned = isAdmin(user.role) ? [] : await assignedCollegeIds(db, user.id);
  const rows = await db
    .select({ deal: sponsorDeals, company: companies.name, college: colleges.name })
    .from(sponsorDeals)
    .innerJoin(companies, eq(companies.id, sponsorDeals.companyId))
    .leftJoin(colleges, eq(colleges.id, sponsorDeals.collegeId))
    .where(dealScope(user, assigned))
    .orderBy(desc(sponsorDeals.updatedAt));
  return rows.map((r) => ({ ...r.deal, company: r.company, college: r.college }));
});

export const POST = api(async ({ req, db, user }) => {
  const b = dealCreate.parse(await readJson(req));
  if (!isAdmin(user.role)) {
    if (b.collegeId && !(await assignedCollegeIds(db, user.id)).includes(b.collegeId)) {
      throw new HttpError(403, "This college isn't assigned to you");
    }
    b.stage = "reach_out"; // executives start every deal at the first stage
  }
  if (b.stage !== "reach_out") {
    const err = checkDealMove(user.role, "reach_out", b.stage, b, b.stage === "lost" ? "Other" : "");
    if (err) throw new HttpError(400, err);
  }
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(sponsorDeals)
      .values({ ...b, contactPhone: normPhone(b.contactPhone), createdBy: user.id, lostReason: b.stage === "lost" ? "Other" : "" })
      .returning({ id: sponsorDeals.id });
    await tx.insert(sponsorDealLog).values({ dealId: row.id, fromStage: "new", toStage: b.stage, byUserId: user.id });
    // remember a new contact on the company so the next person reaching out can pick it
    const phone = normPhone(b.contactPhone);
    if (phone) {
      const known = await tx.select({ id: companyContacts.id }).from(companyContacts).where(and(eq(companyContacts.companyId, b.companyId), eq(companyContacts.phone, phone))).limit(1);
      if (!known.length) await tx.insert(companyContacts).values({ companyId: b.companyId, name: b.contactName, designation: "", phone });
    }
    return row.id;
  });
  return { id };
});
