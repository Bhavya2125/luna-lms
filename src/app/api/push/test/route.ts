import { api, HttpError } from "@/lib/api";
import { configurePush, pushToUser } from "@/lib/push";

/** Sends a test notification to the signed-in person's devices. */
export const POST = api(async ({ db, user }) => {
  const problem = configurePush();
  if (problem) throw new HttpError(503, problem);
  const r = await pushToUser(db, user.id, { title: "Luna Wave", body: "Notifications are working on this device.", url: "/home" });
  if (!r.sent && !r.failed) throw new HttpError(400, "Turn on alerts on this device first");
  if (!r.sent) throw new HttpError(502, "The notification couldn't be delivered. Turn alerts off and on again on this device.");
  return r;
});
