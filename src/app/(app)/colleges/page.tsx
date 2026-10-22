import { Suspense } from "react";
import type { Metadata } from "next";
import { CollegesView } from "@/components/colleges/CollegesView";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Colleges" };

export default async function CollegesPage() {
  const me = (await getSessionUser())!;
  return (
    <Suspense fallback={<div className="sub">Loading…</div>}>
      <CollegesView me={me} />
    </Suspense>
  );
}
