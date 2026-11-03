import { count, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/connect";
import * as schema from "@/db/schema";
import { collegeKey, nameKey } from "./format";

const { colleges } = schema;
type Ref = [college: string, city: string, fest: string];
type Row = typeof colleges.$inferSelect;
type Fields = Partial<Pick<Row, "name" | "city" | "festName" | "festInstagram" | "festType">>;
export type MergeSpec = {
  merge: { keep: Ref; drop?: Ref[]; clear?: Ref[]; set?: Fields }[];
  edit: { row: Ref; set: Fields }[];
};

const refKey = (name: string, city: string, fest: string) => `${nameKey(name)}|${nameKey(city)}|${nameKey(fest)}`;

/** True once the team has done anything with a college: moved, assigned, noted, logged history or linked a deal. */
async function touchedIds(db: Db, ids: number[]) {
  const out = new Set<number>();
  if (!ids.length) return out;
  const tables = [
    [schema.collegeAssignments, schema.collegeAssignments.collegeId],
    [schema.collegeNotes, schema.collegeNotes.collegeId],
    [schema.collegeStageLog, schema.collegeStageLog.collegeId],
    [schema.collegeYears, schema.collegeYears.collegeId],
    [schema.collegeSponsorships, schema.collegeSponsorships.collegeId],
    [schema.collegeArtistEntries, schema.collegeArtistEntries.collegeId],
    [schema.collegeProductionEntries, schema.collegeProductionEntries.collegeId],
    [schema.sponsorDeals, schema.sponsorDeals.collegeId],
  ] as const;
  for (const [t, col] of tables) {
    const rows = await db.select({ id: col, n: count() }).from(t).where(inArray(col, ids)).groupBy(col);
    for (const r of rows) if (r.id != null) out.add(r.id);
  }
  return out;
}

/**
 * Merges duplicate fests from a bundled list. The extra row's month, Instagram and other details fill blanks on the
 * row that stays, then the extra row is deleted ("clear" keeps that college and only removes the fest from it).
 * Rows the team has worked on are never deleted or rewritten; if only the extra row was worked on, it stays instead.
 */
export async function applyFestMerges(db: Db, spec: MergeSpec) {
  const all = await db.select().from(colleges);
  const byRef = new Map(all.map((c) => [refKey(c.name, c.city, c.festName), c]));
  const touched = await touchedIds(db, all.map((c) => c.id));
  const busy = (c: Row) => touched.has(c.id) || !!c.lastTouchedAt || c.stage !== "reach_out";
  const keys = new Set(all.map((c) => c.nameKey));
  const find = (r: Ref) => byRef.get(refKey(...r));
  let merged = 0;
  let cleared = 0;
  let edited = 0;
  const skipped: string[] = [];

  async function update(c: Row, p: Partial<Row>) {
    if (!Object.keys(p).length) return;
    if (p.city !== undefined || p.name !== undefined) {
      // keep the "name|city" key in step with a corrected city
      const base = collegeKey(p.name ?? c.name, p.city ?? c.city);
      if (c.nameKey !== base && !c.nameKey.startsWith(`${base}|`)) {
        let key = keys.has(base) ? `${base}|${nameKey(c.festName) || "fest"}` : base;
        for (let n = 2; keys.has(key); n++) key = `${base}|${nameKey(c.festName) || "fest"}${n}`;
        keys.delete(c.nameKey);
        keys.add(key);
        p.nameKey = key;
      }
    }
    await db.update(colleges).set({ ...p, updatedAt: new Date() }).where(eq(colleges.id, c.id));
    Object.assign(c, p);
  }
  /** Blank fields on `into` taken from `from`; fest-only when the two rows are different institutions. */
  function fill(into: Row, from: Row, festOnly: boolean): Partial<Row> {
    const p: Partial<Row> = {};
    if (!into.festName && from.festName) p.festName = from.festName;
    if (!into.festInstagram && from.festInstagram) p.festInstagram = from.festInstagram;
    if (into.festMonth == null && from.festMonth != null) Object.assign(p, { festMonth: from.festMonth, festYear: from.festYear });
    if (!into.festStart && from.festStart) Object.assign(p, { festStart: from.festStart, festEnd: from.festEnd });
    if (into.festType === "other" && from.festType !== "other") p.festType = from.festType;
    if (festOnly) return p;
    if (!into.collegeInstagram && from.collegeInstagram) p.collegeInstagram = from.collegeInstagram;
    if (!into.tier && from.tier) p.tier = from.tier;
    if (!into.collegeType && from.collegeType) p.collegeType = from.collegeType;
    if (!into.state && from.state) p.state = from.state;
    return p;
  }

  for (const m of spec.merge) {
    let keep = find(m.keep);
    if (!keep) continue; // not in this database (or already merged)
    if (m.set && !busy(keep)) await update(keep, { ...m.set });
    for (const r of m.drop ?? []) {
      let extra = find(r);
      if (!extra || extra.id === keep.id) continue;
      if (busy(extra) && busy(keep)) {
        skipped.push(`${extra.name} (${extra.festName}): both copies are in use`);
        continue;
      }
      if (busy(extra)) [keep, extra] = [extra, keep]; // the copy the team uses stays
      await update(keep, fill(keep, extra, false));
      await db.delete(colleges).where(eq(colleges.id, extra.id));
      keys.delete(extra.nameKey);
      byRef.delete(refKey(extra.name, extra.city, extra.festName));
      merged++;
    }
    for (const r of m.clear ?? []) {
      const other = find(r);
      if (!other || other.id === keep.id) continue;
      if (busy(other)) {
        skipped.push(`${other.name} (${other.festName}): in use, fest left on it`);
        continue;
      }
      await update(keep, fill(keep, other, true));
      byRef.delete(refKey(other.name, other.city, other.festName));
      await update(other, { festName: "", festInstagram: "", festMonth: null, festStart: null, festEnd: null, festType: "other" });
      cleared++;
    }
  }
  for (const e of spec.edit) {
    const c = find(e.row);
    if (!c) continue;
    if (busy(c)) {
      skipped.push(`${c.name}: in use, not edited`);
      continue;
    }
    await update(c, { ...e.set });
    edited++;
  }
  return `${merged} duplicates merged, ${cleared} fests moved, ${edited} rows corrected${skipped.length ? `; skipped: ${skipped.join("; ")}` : ""}`;
}
