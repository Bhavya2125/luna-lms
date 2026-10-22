"use client";
import { useEffect } from "react";

/** Registers the service worker. In development it runs with caching off (push only), so edits always show. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const url = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev=1";
    navigator.serviceWorker.register(url, { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
