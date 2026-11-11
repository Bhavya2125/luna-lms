"use client";
import { useState } from "react";
import { useInstall, type InstallPlatform } from "@/lib/pwa";

/** Safari's share icon, so the steps match what people see on screen. */
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Share" style={{ verticalAlign: "-2px" }}>
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);

/** Step-by-step install instructions for browsers without an install button (all Apple browsers). */
export function InstallSteps({ platform }: { platform: InstallPlatform }) {
  if (platform === "ios-inapp") {
    return (
      <div className="sub">
        You&apos;re in another app&apos;s built-in browser, which can&apos;t install apps. Tap <b>⋯</b> (or the compass) and choose <b>Open in Safari</b>, then install from there.
      </div>
    );
  }
  if (platform === "ios") {
    return (
      <ol className="sub steps-list">
        <li>
          Tap <b>Share</b> <ShareIcon /> in Safari (on newer iPhones it&apos;s under <b>⋯</b>; on iPad it&apos;s at the top right).
        </li>
        <li>
          Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.
        </li>
        <li>Open Luna Wave from your Home Screen. Push alerts only work there.</li>
      </ol>
    );
  }
  if (platform === "mac-safari") {
    return (
      <div className="sub">
        In Safari&apos;s menu bar choose <b>File → Add to Dock</b> (or Share <ShareIcon /> → Add to Dock).
      </div>
    );
  }
  return <div className="sub">Use your browser&apos;s Install or Add to Home Screen option.</div>;
}

/**
 * Offers to install the app: a one-tap prompt on Android/Chrome, written steps on Apple devices.
 * Shown on every visit and refresh until the app is installed; "Not now" only hides it for this page view.
 */
export function InstallBanner() {
  const { canInstall, installed, install, platform } = useInstall();
  const [hidden, setHidden] = useState(false);
  if (installed || hidden || !(canInstall || platform !== "other")) return null;
  const dismiss = () => setHidden(true);
  return (
    <div className="box install" role="region" aria-label="Install the app">
      <div style={{ minWidth: 0, flex: 1 }}>
        <b>Install Luna Wave</b>
        {canInstall ? <div className="sub">Add it to your home screen for one-tap access, offline reading and push alerts.</div> : <InstallSteps platform={platform} />}
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
