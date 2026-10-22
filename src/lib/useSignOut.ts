"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { post } from "./client";
import { clearOfflineData } from "./pwa";

/** Ends the session, forgets cached data on this device and returns to the sign-in page. */
export function useSignOut() {
  const router = useRouter();
  return useCallback(async () => {
    try {
      await post("/api/auth/logout");
    } catch {}
    clearOfflineData();
    router.replace("/login");
    router.refresh();
  }, [router]);
}
