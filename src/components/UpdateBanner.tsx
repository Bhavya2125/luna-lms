"use client";
import { useEffect, useState } from "react";

const MINE = process.env.NEXT_PUBLIC_BUILD_ID;

/** Shows a reload prompt when a newer version has been deployed since this page loaded. */
export function UpdateBanner() {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    let stop = false;
    const check = async () => {
      if (stop || document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const { build } = await r.json();
        if (build && MINE && build !== MINE) setStale(true);
      } catch {}
    };
    check();
    const t = setInterval(check, 5 * 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      stop = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  if (!stale) return null;
  return (
    <div className="box install" role="status">
      <div>
        <b>A new version of Luna Wave is ready</b>
        <div className="sub">Reload to get the latest changes.</div>
      </div>
      <button className="p" onClick={() => location.reload()}>
        Reload
      </button>
    </div>
  );
}
