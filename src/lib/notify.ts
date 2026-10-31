import "server-only";
import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { schema, type Db } from "@/db";
import { configurePush, pushToUser } from "./push";

type Payload = { title: string; body: string; url: string };

/** People working on a college. */
export async function collegePeople(db: Db, collegeId: number) {
  const rows = await db.select({ id: schema.collegeAssignments.userId }).from(schema.collegeAssignments).where(eq(schema.collegeAssignments.collegeId, collegeId));
  return rows.map((r) => r.id);
}

/** People on a sponsor deal: the college's team, or whoever started an overall deal. */
export async function dealPeople(db: Db, deal: { collegeId: number | null; createdBy: number | null }) {
  if (deal.collegeId) return collegePeople(db, deal.collegeId);
  return deal.createdBy ? [deal.createdBy] : [];
}

export async function adminIds(db: Db) {
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.active, true), inArray(schema.users.role, ["admin", "super_admin"])));
  return rows.map((r) => r.id);
}

/**
 * Sends a push to these people once the response has gone out, so saving never waits on it or fails because of it.
 * The person who did the action is never notified about it.
 */
export function notifyLater(db: Db, userIds: number[], actorId: number, payload: Payload) {
  const ids = [...new Set(userIds)].filter((id) => id !== actorId);
  if (!ids.length) return;
  after(async () => {
    if (configurePush()) return; // push keys not set up: nothing to send
    for (const id of ids) {
      try {
        await pushToUser(db, id, payload);
      } catch (e) {
        console.error("push failed", e);
      }
    }
  });
}

export const firstName = (name: string) => name.split(" ")[0];
