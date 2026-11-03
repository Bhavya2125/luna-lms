import { readFile } from "node:fs/promises";
import path from "node:path";
import { importCollegesCsv } from "@/lib/collegeImport";
import type { Db } from "./connect";
import { dataImports } from "./schema";

/** Data sets shipped in ./data. Each loads once per database; rename an entry to load a new version of a file. */
const DATA_SETS = [{ name: "india-college-fests-2026-11", file: "india-college-fests.csv" }];

export async function runDataImports(db: Db) {
  const done = new Set((await db.select({ name: dataImports.name }).from(dataImports)).map((r) => r.name));
  for (const d of DATA_SETS) {
    if (done.has(d.name)) continue;
    const csv = await readFile(path.join(process.cwd(), "data", d.file), "utf8");
    const r = await importCollegesCsv(db, csv, null);
    const result = `${r.added} added, ${r.updated} updated, ${r.duplicates.length} already listed, ${r.notImported.length} not imported`;
    await db.insert(dataImports).values({ name: d.name, result }).onConflictDoNothing();
    console.log(`Data import ${d.name}: ${result}`);
  }
}
