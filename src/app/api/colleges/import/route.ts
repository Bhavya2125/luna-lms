import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@/db";
import { api, readJson } from "@/lib/api";
import { normFestType, parseCSV, parseMonth } from "@/lib/csv";
import { collegeKey } from "@/lib/format";
import { nextFestYear } from "@/lib/queries";

const { colleges } = schema;

export const POST = api(
  async ({ req, db, user }) => {
    const { csv } = z.object({ csv: z.string().max(2_000_000) }).parse(await readJson(req));
    const rows = parseCSV(csv.replace(/^﻿/, ""));
    let header: string[] | null = null;
    if (rows[0]?.some((x) => /college|city|state|month|fest/i.test(x))) header = rows.shift()!.map((x) => x.toLowerCase());
    const ix = (re: RegExp, d: number) => (header ? header.findIndex((x) => re.test(x)) : d);
    const I = { n: ix(/college|institut|universit|^name/, 0), c: ix(/city|location/, 1), s: ix(/state/, 2), m: ix(/month|date/, 3), d: ix(/day/, 4), t: ix(/type|categor/, 5) };
    const seen = new Set<string>();
    const dups: string[] = [];
    const bad: string[] = [];
    let added = 0;
    for (const [i, r] of rows.entries()) {
      const g = (k: keyof typeof I) => (I[k] >= 0 ? (r[I[k]] ?? "") : "");
      const name = g("n").replace(/\s+/g, " ").trim();
      if (!name) {
        bad.push(`Row ${i + 1}: missing college name`);
        continue;
      }
      const city = g("c");
      if (!city) {
        bad.push(`${name}: missing city`);
        continue;
      }
      const pm = parseMonth(g("m"));
      if (!pm) {
        bad.push(`${name}: month or date is missing or not readable`);
        continue;
      }
      const key = collegeKey(name, city);
      const [exists] = await db.select({ id: colleges.id }).from(colleges).where(eq(colleges.nameKey, key)).limit(1);
      if (exists || seen.has(key)) {
        dups.push(name);
        continue;
      }
      seen.add(key);
      await db.insert(colleges).values({
        name,
        city,
        state: g("s"),
        nameKey: key,
        festType: normFestType(g("t")),
        festMonth: pm.month,
        festYear: pm.date ? Number(pm.date.slice(0, 4)) : nextFestYear(pm.month),
        festStart: pm.date ?? null,
        days: Math.min(7, Math.max(1, parseInt(g("d")) || 2)),
        createdBy: user.id,
      });
      added++;
    }
    return { added, duplicates: dups, notImported: bad };
  },
  { roles: ["admin", "super_admin"] },
);
