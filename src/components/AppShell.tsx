"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import useSWR, { SWRConfig } from "swr";
import { fetcher } from "@/lib/client";
import { useOnline } from "@/lib/pwa";
import type { AlertItem } from "@/lib/types";
import { InstallBanner } from "./InstallBanner";
import { Overlay, ToastProvider } from "./ui";

const I = {
  bell: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />,
  colleges: <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6M9 11h.01M15 11h.01" />,
  sponsors: <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z" />,
  roster: <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />,
  settings: <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.5 7.5 0 0 0-1.7 1l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7.5 7.5 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 1.7-1l2.3.9 2-3.4-2-1.5z" />,
};
const Icon = ({ k }: { k: keyof typeof I }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {I[k]}
  </svg>
);

const PAGES = [
  { href: "/colleges", k: "colleges", label: "Colleges" },
  { href: "/sponsors", k: "sponsors", label: "Sponsors" },
  { href: "/roster", k: "roster", label: "Roster" },
  { href: "/settings", k: "settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const online = useOnline();
  const [bell, setBell] = useState(false);
  const { data: alerts } = useSWR<AlertItem[]>("/api/alerts", fetcher, { refreshInterval: 5 * 60_000 });

  return (
    <SWRConfig value={{ revalidateOnMount: true, revalidateOnFocus: true, dedupingInterval: 1000 }}>
    <ToastProvider>
      {!online && <div className="offline">You're offline. You can read recently opened pages, but changes won't save until you reconnect.</div>}
      <div className="app">
        <nav className="side" aria-label="Main">
          <div className="logo">
            <Image className="lg" src="/logo.png" alt="Luna Wave" width={112} height={87} priority />
          </div>
          {PAGES.map((p) => (
            <Link key={p.href} href={p.href} className={`nv${path.startsWith(p.href) ? " on" : ""}`} aria-current={path.startsWith(p.href) ? "page" : undefined}>
              <Icon k={p.k} /> {p.label}
            </Link>
          ))}
        </nav>
        <main>
          <div className="topbar">
            <button className="icon-btn" aria-label={`Alerts${alerts?.length ? `, ${alerts.length} new` : ""}`} title="Alerts" onClick={() => setBell(true)}>
              <Icon k="bell" />
              {alerts && alerts.length > 0 && <span className="dot">{alerts.length}</span>}
            </button>
          </div>
          <InstallBanner />
          {children}
        </main>
        <nav className="bot" aria-label="Main">
          {PAGES.map((p) => (
            <Link key={p.href} href={p.href} className={path.startsWith(p.href) ? "on" : ""} aria-current={path.startsWith(p.href) ? "page" : undefined}>
              <Icon k={p.k} />
              {p.label}
            </Link>
          ))}
        </nav>
        {bell && <AlertsPanel alerts={alerts ?? []} onClose={() => setBell(false)} />}
      </div>
    </ToastProvider>
    </SWRConfig>
  );
}

function AlertsPanel({ alerts, onClose }: { alerts: AlertItem[]; onClose: () => void }) {
  const router = useRouter();
  return (
    <Overlay onClose={onClose} label="Alerts">
      <div className="top">
        <h2>Alerts</h2>
        <button onClick={onClose}>Close</button>
      </div>
      <p className="sub">One month before each fest, the people assigned to it get a reminder. Turn on push in Settings to get these on your phone.</p>
      {!alerts.length && <div className="box">Nothing due right now.</div>}
      {alerts.map((a) => (
        <div key={a.collegeId + a.kind} className="box" style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <span>
            {a.message}
            <div className="sub">{a.daysUntil} day{a.daysUntil === 1 ? "" : "s"} to go</div>
          </span>
          <button
            onClick={() => {
              onClose();
              router.push(`/colleges?open=${a.collegeId}`);
            }}
          >
            Open
          </button>
        </div>
      ))}
    </Overlay>
  );
}
