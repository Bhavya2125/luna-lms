import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = (await getSessionUser())!;
  return <SettingsView me={me} />;
}
