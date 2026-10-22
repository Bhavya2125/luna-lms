import type { Metadata } from "next";
import { SponsorsView } from "@/components/sponsors/SponsorsView";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sponsors" };

export default async function SponsorsPage() {
  const me = (await getSessionUser())!;
  return <SponsorsView me={me} />;
}
