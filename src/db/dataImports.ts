import { readFile } from "node:fs/promises";
import path from "node:path";
import { importCollegesCsv } from "@/lib/collegeImport";
import { applyFestMerges, type MergeSpec } from "@/lib/festMerges";
import type { Db } from "./connect";
import { dataImports } from "./schema";

const read = (file: string) => readFile(path.join(process.cwd(), "data", file), "utf8");

/** Data sets shipped in ./data, run in order. Each runs once per database; rename an entry to run a new version. */
const DATA_SETS: { name: string; run: (db: Db) => Promise<string> }[] = [
  // v2 adds about 390 colleges; databases that already loaded v1 only get the new rows and blank fields filled
  {
    name: "india-college-fests-2026-11-v2",
    run: async (db) => {
      const r = await importCollegesCsv(db, await read("india-college-fests.csv"), null);
      return `${r.added} added, ${r.updated} updated, ${r.duplicates.length} already listed, ${r.notImported.length} not imported`;
    },
  },
  // the same fest listed under two spellings of a college; the CSV above is already clean for new databases
  { name: "fest-merges-2026-11", run: async (db) => applyFestMerges(db, JSON.parse(await read("fest-merges.json")) as MergeSpec) },
];

export async function runDataImports(db: Db) {
  const done = new Set((await db.select({ name: dataImports.name }).from(dataImports)).map((r) => r.name));
  for (const d of DATA_SETS) {
    if (done.has(d.name)) continue;
    const result = await d.run(db);
    await db.insert(dataImports).values({ name: d.name, result }).onConflictDoNothing();
    console.log(`Data import ${d.name}: ${result}`);
  }
}
