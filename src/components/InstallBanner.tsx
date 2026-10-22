"use client";
import { useEffect, useState } from "react";
import { useInstall } from "@/lib/pwa";

/** Offers to install the app: a one-tap prompt on Android/Chrome, Share → Add to Home Screen steps on iPhone. */
export function InstallBanner() {
  const { canInstall, installed, install, ios } = useInstall();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem("lw_install_dismissed") === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  if (installed || hidden || !(canInstall || ios)) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem("lw_install_dismissed", "1");
    } catch {}
  };
  return (
    <div className="box install" role="region" aria-label="Install the app">
      <div>
        <b>Install Luna Wave</b>
        <div className="sub">{ios ? "Tap the Share button, then Add to Home Screen. Push alerts work once it's on your Home Screen." : "Add it to your home screen for one-tap access, offline reading and push alerts."}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {canInstall && (
          <button className="p" onClick={install}>
            Install
          </button>
        )}
        <button aria-label="Not now" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
