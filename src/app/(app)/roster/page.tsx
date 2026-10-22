import type { Metadata } from "next";
import { RosterView } from "@/components/roster/RosterView";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Artist roster" };

export default async function RosterPage() {
  const me = (await getSessionUser())!;
  return <RosterView me={me} />;
}
