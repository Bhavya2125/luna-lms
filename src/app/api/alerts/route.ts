import { api, isAdmin } from "@/lib/api";
import { computeAlerts } from "@/lib/alerts";
import { assignedCollegeIds } from "@/lib/queries";

export const GET = api(async ({ db, user }) => {
  const ids = isAdmin(user.role) ? "all" : await assignedCollegeIds(db, user.id);
  return computeAlerts(db, ids);
});
