import { and, desc, eq, inArray, ilike, or, sql } from "drizzle-orm";
import { schema } from "@/db";
import { api, HttpError, isAdmin, readJson } from "@/lib/api";
import { collegeKey } from "@/lib/format";
import { assigneesFor, collegeScope, nextFestYear } from "@/lib/queries";
import { collegeCreate } from "@/lib/validators";

const { colleges, collegeAssignments, collegeYears } = schema;

export const GET = api(async ({ req, db, user }) => {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const conds = [collegeScope(user)];
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    conds.push(or(ilike(colleges.name, like), ilike(colleges.city, like), ilike(colleges.state, like), ilike(colleges.festName, like)));
  }
  if (sp.get("month")) conds.push(eq(colleges.festMonth, Number(sp.get("month"))));
  if (sp.get("stage")) conds.push(eq(colleges.stage, sp.get("stage") as never));
  if (sp.get("days")) conds.push(eq(colleges.days, Number(sp.get("days"))));
  if (sp.get("state")) conds.push(eq(colleges.state, sp.get("state")!));
  const rows = await db
    .select()
    .from(colleges)
    .where(and(...conds))
    .orderBy(sql`lower(${colleges.name})`);

  const ids = rows.map((r) => r.id);
  const assignees = await assigneesFor(db, ids);
  const yrs = ids.length ? await db.select().from(collegeYears).where(inArray(collegeYears.collegeId, ids)).orderBy(desc(collegeYears.year)) : [];
  const agency = new Map<number, string>();
  for (const y of yrs) if (y.agency && !agency.has(y.collegeId)) agency.set(y.collegeId, y.agency);

  let out = rows.map((r) => ({ ...r, assignees: assignees.get(r.id) ?? [], previousAgency: agency.get(r.id) ?? "" }));
  const mine = sp.get("tab") === "mine" || !isAdmin(user.role);
  if (mine && isAdmin(user.role)) out = out.filter((r) => r.assignees.some((a) => a.id === user.id));
  const a = sp.get("assignee");
  if (a === "me") out = out.filter((r) => r.assignees.some((x) => x.id === user.id));
  else if (a === "none") out = out.filter((r) => !r.assignees.length);
  else if (a) out = out.filter((r) => r.assignees.some((x) => x.id === Number(a)));
  const prev = sp.get("agency");
  if (prev) out = out.filter((r) => r.previousAgency === prev);
  const b = sp.get("budget");
  if (b) {
    out = out.filter((r) => {
      const t = r.artistBudget + r.prodBudget;
      return b === "1" ? t > 0 && t < 500_000 : b === "2" ? t >= 500_000 && t < 2_000_000 : t >= 2_000_000;
    });
  }
  return out;
});

export const POST = api(async ({ req, db, user }) => {
  const b = collegeCreate.parse(await readJson(req));
  const start = b.festStart;
  let month = b.festMonth;
  let year = b.festYear;
  if (start) {
    month = Number(start.slice(5, 7)) - 1;
    year = Number(start.slice(0, 4));
  }
  if (month === null || month === undefined) throw new HttpError(400, "Pick a month or an exact date");
  year ??= nextFestYear(month);
  const key = collegeKey(b.name, b.city);
  const [dup] = await db.select({ name: colleges.name }).from(colleges).where(eq(colleges.nameKey, key)).limit(1);
  if (dup) throw new HttpError(409, `${dup.name} is already in the list`);
  const [row] = await db
    .insert(colleges)
    .values({
      name: b.name.replace(/\s+/g, " "),
      city: b.city,
      state: b.state,
      nameKey: key,
      festName: b.festName,
      festType: b.festType,
      festMonth: month,
      festYear: year,
      festStart: start,
      festEnd: b.festEnd,
      days: b.days,
      createdBy: user.id,
    })
    .returning({ id: colleges.id });
  if (!isAdmin(user.role)) await db.insert(collegeAssignments).values({ collegeId: row.id, userId: user.id });
  return { id: row.id };
});
