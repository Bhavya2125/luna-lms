import type { Metadata } from "next";
import { HomeView } from "@/components/home/HomeView";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const me = (await getSessionUser())!;
  return <HomeView me={me} />;
}
