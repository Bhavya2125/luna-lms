import { z } from "zod";
import { api, readJson } from "@/lib/api";
import { importCollegesCsv } from "@/lib/collegeImport";

export const POST = api(
  async ({ req, db, user }) => {
    const { csv } = z.object({ csv: z.string().max(2_000_000) }).parse(await readJson(req));
    return importCollegesCsv(db, csv, user.id);
  },
  { roles: ["admin", "super_admin"] },
);
