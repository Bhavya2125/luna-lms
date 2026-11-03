import { eq } from "drizzle-orm";
import type { Db } from "@/db/connect";
import * as schema from "@/db/schema";
import { normFestType, parseCSV, parseMonth } from "./csv";
import { collegeKey, igHandle, nameKey } from "./format";
import { nextFestYear } from "./priority";

const { colleges } = schema;

export type ImportResult = { added: number; updated: number; duplicates: string[]; notImported: string[] };
type Existing = Pick<typeof colleges.$inferSelect, "id" | "nameKey" | "festName" | "festMonth" | "state" | "tier" | "collegeType" | "collegeInstagram" | "festInstagram">;

/** A college's rows share "name|city"; extra fests at the same college add "|fest" to keep the key unique. */
const baseOf = (key: string) => key.split("|").slice(0, 2).join("|");

/** Picks the column for each field from a header row; without a header the old fixed order is used. */
function columns(header: string[] | null) {
  const find = (want: RegExp, not?: RegExp) => (header ? header.findIndex((x) => want.test(x) && !(not && not.test(x))) : -1);
  const pick = (d: number, ...tries: [RegExp, RegExp?][]) => {
    if (!header) return d;
    for (const [w, n] of tries) {
      const i = find(w, n);
      if (i >= 0) return i;
    }
    return -1;
  };
  const link = /link|url/;
  return {
    name: pick(0, [/college|institut|universit|^name/, /insta|type|link|tier/]),
    city: pick(1, [/city|location/]),
    state: pick(2, [/state/]),
    month: pick(3, [/month|date/]),
    days: pick(4, [/^days?$|no\.? of days|number of days/]),
    festType: pick(5, [/fest\s*type/], [/type|categor/, /college|institut/]),
    festName: pick(-1, [/fest\s*name|^fest$/]),
    tier: pick(-1, [/tier/]),
    collegeType: pick(-1, [/(college|institut\w*)\s*type/]),
    collegeIg: pick(-1, [/college.*insta/, link], [/^insta(gram)?$/], [/college.*insta/]),
    festIg: pick(-1, [/fest.*insta/, link], [/fest.*insta/]),
  };
}

/**
 * Adds colleges from CSV text. Rows that match a college already in the list (same name, city and fest) only fill in
 * fields that are still blank, such as Instagram handles, tier or a missing month; nothing typed by the team is overwritten.
 */
export async function importCollegesCsv(db: Db, csv: string, createdBy: number | null): Promise<ImportResult> {
  const rows = parseCSV(csv.replace(/^﻿/, ""));
  let header: string[] | null = null;
  if (rows[0]?.some((x) => /college|city|state|month|fest/i.test(x))) header = rows.shift()!.map((x) => x.toLowerCase().trim());
  const I = columns(header);

  const existing: Existing[] = await db
    .select({ id: colleges.id, nameKey: colleges.nameKey, festName: colleges.festName, festMonth: colleges.festMonth, state: colleges.state, tier: colleges.tier, collegeType: colleges.collegeType, collegeInstagram: colleges.collegeInstagram, festInstagram: colleges.festInstagram })
    .from(colleges);
  const keys = new Set(existing.map((c) => c.nameKey));
  const byBase = new Map<string, Existing[]>();
  for (const c of existing) byBase.set(baseOf(c.nameKey), [...(byBase.get(baseOf(c.nameKey)) ?? []), c]);

  const res: ImportResult = { added: 0, updated: 0, duplicates: [], notImported: [] };
  const inserts: (typeof colleges.$inferInsert)[] = [];
  for (const [i, r] of rows.entries()) {
    const g = (k: keyof typeof I) => (I[k] >= 0 ? (r[I[k]] ?? "").trim() : "");
    const name = g("name").replace(/\s+/g, " ");
    const city = g("city");
    if (!name) {
      res.notImported.push(`Row ${i + 1}: missing college name`);
      continue;
    }
    if (!city) {
      res.notImported.push(`${name}: missing city`);
      continue;
    }
    const pm = g("month") ? parseMonth(g("month")) : null;
    if (g("month") && !pm) {
      res.notImported.push(`${name}: month or date "${g("month")}" is not readable`);
      continue;
    }
    const row = {
      state: g("state"),
      festName: g("festName").slice(0, 120),
      tier: g("tier").slice(0, 20),
      collegeType: g("collegeType").slice(0, 60),
      collegeInstagram: igHandle(g("collegeIg")),
      festInstagram: igHandle(g("festIg")),
    };
    const base = collegeKey(name, city);
    const fk = nameKey(row.festName);
    const same = byBase.get(base) ?? [];
    const match = same.find((c) => nameKey(c.festName) === fk) ?? (fk ? same.find((c) => !c.festName) : same[0]);

    if (match) {
      let changed = false;
      // college-level details apply to every fest row of that college
      for (const c of same) {
        const p: Partial<Existing> = {};
        if (!c.state && row.state) p.state = row.state;
        if (!c.tier && row.tier) p.tier = row.tier;
        if (!c.collegeType && row.collegeType) p.collegeType = row.collegeType;
        if (!c.collegeInstagram && row.collegeInstagram) p.collegeInstagram = row.collegeInstagram;
        if (c === match) {
          if (!c.festName && row.festName) p.festName = row.festName;
          if (!c.festInstagram && row.festInstagram) p.festInstagram = row.festInstagram;
          if (c.festMonth == null && pm) p.festMonth = pm.month;
        }
        if (!Object.keys(p).length) continue;
        const extra = p.festMonth != null ? { festYear: pm?.date ? Number(pm.date.slice(0, 4)) : nextFestYear(p.festMonth) } : {};
        // negative ids are rows from earlier in this same file that are not saved yet
        if (c.id < 0) Object.assign(inserts[-c.id - 1], p, extra);
        else await db.update(colleges).set({ ...p, ...extra, updatedAt: new Date() }).where(eq(colleges.id, c.id));
        Object.assign(c, p);
        changed = true;
      }
      if (changed) res.updated++;
      else res.duplicates.push(row.festName ? `${name} (${row.festName})` : name);
      continue;
    }

    let key = same.length || keys.has(base) ? `${base}|${fk || "fest"}` : base;
    for (let n = 2; keys.has(key); n++) key = `${base}|${fk || "fest"}${n}`;
    keys.add(key);
    const month = pm?.month ?? null;
    inserts.push({
      name,
      city,
      ...row,
      nameKey: key,
      festType: g("festType") ? normFestType(g("festType")) : "other",
      festMonth: month,
      festYear: pm?.date ? Number(pm.date.slice(0, 4)) : nextFestYear(month),
      festStart: pm?.date ?? null,
      days: Math.min(7, Math.max(1, parseInt(g("days")) || 2)),
      createdBy,
    });
    byBase.set(base, [...same, { id: -inserts.length, nameKey: key, festMonth: month, ...row }]);
  }
  // one round trip per 200 colleges keeps a large file fast on a remote database
  for (let i = 0; i < inserts.length; i += 200) await db.insert(colleges).values(inserts.slice(i, i + 200));
  res.added = inserts.length;
  return res;
}
