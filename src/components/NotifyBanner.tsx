"use client";
import { useEffect, useState } from "react";
import { usePush } from "@/lib/pwa";

/**
 * Asks once for notification permission. Browsers only allow the permission request after a tap,
 * so this is a one-tap prompt; it hides once alerts are on, permission was refused, or it was dismissed.
 */
export function NotifyBanner() {
  const push = usePush();
  const [show, setShow] = useState(false);
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("lw_notify_dismissed") === "1";
    } catch {}
    setShow(!dismissed && typeof Notification !== "undefined" && Notification.permission === "default");
  }, []);
  if (!show || !push.supported || push.on) return null;
  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem("lw_notify_dismissed", "1");
    } catch {}
  };
  return (
    <div className="box install" role="region" aria-label="Turn on alerts">
      <div>
        <b>Turn on alerts</b>
        <div className="sub">Get a notification for due steps, target dates and fests coming up, even when the app is closed.</div>
        {push.error && <div className="err">{push.error}</div>}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          className="p"
          disabled={push.busy}
          onClick={async () => {
            await push.enable();
            if (typeof Notification !== "undefined" && Notification.permission !== "default") setShow(false);
          }}
        >
          {push.busy ? "Turning on…" : "Turn on"}
        </button>
        <button onClick={dismiss}>Not now</button>
      </div>
    </div>
  );
}
