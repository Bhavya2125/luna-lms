"use client";
import "@/app/home.css";
import { useMemo, useState, type ReactNode } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher, initials } from "@/lib/client";
import { fmtDate, inr } from "@/lib/format";
import type { HomeData, QueueItem, TimelineFest } from "@/lib/home";
import { addDays, LEVEL_LABEL } from "@/lib/priority";
import { COLLEGE_STAGES, DEAL_STAGES, STAGE_LABEL } from "@/lib/stages";
import type { CollegeRow, Me } from "@/lib/types";
import { CollegeDrawer } from "../colleges/CollegeDrawer";
import { AssignModal } from "../colleges/CollegesView";
import { DueTag, NextStepModal, TargetTag } from "../NextStep";
import { CompanyDrawer } from "../sponsors/CompanyDrawer";

type Filter = "all" | "college" | "deal" | "overdue" | "today" | "fests" | "awaiting";
const GROUPS: [QueueItem["group"], string][] = [
  ["overdue", "Overdue"],
  ["today", "Today"],
  ["week", "This week"],
  ["later", "Later"],
];

const ICONS = {
  alert: <path d="M12 8v5M12 16.5v.5M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />,
  clock: <path d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />,
  calendar: <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />,
  reply: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 6 6v5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  open: <path d="M9 6h9v9M18 6 6 18" />,
  chat: <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />,
};
const Ic = ({ k, size = 18 }: { k: keyof typeof ICONS; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {ICONS[k]}
  </svg>
);

function greeting() {
  const h = new Date(Date.now() + 5.5 * 3600e3).getUTCHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
const Level = ({ level }: { level: QueueItem["level"] }) => (
  <span className={`lvl ${level}`}>
    <i />
    {LEVEL_LABEL[level]}
  </span>
);
const Dates = ({ i }: { i: QueueItem }) =>
  i.nextActionDue || i.targetDate ? (
    <span className="chips" style={{ justifyContent: "flex-end" }}>
      <DueTag due={i.nextActionDue} />
      <TargetTag date={i.targetDate} />
    </span>
  ) : null;

export function HomeView({ me }: { me: Me }) {
  const { mutate } = useSWRConfig();
  const [as, setAs] = useState<number | null>(null);
  const key = `/api/home${as ? `?as=${as}` : ""}`;
  const { data, error } = useSWR<HomeData>(key, fetcher, { refreshInterval: 5 * 60_000 });
  const [filter, setFilter] = useState<Filter>("all");
  const [openCollege, setOpenCollege] = useState<number | null>(null);
  const [openCompany, setOpenCompany] = useState<number | null>(null);
  const [step, setStep] = useState<{ item: QueueItem; mode: "done" | "snooze" } | null>(null);
  const [assign, setAssign] = useState<CollegeRow | null>(null);
  const [ownersAll, setOwnersAll] = useState(false);
  const refresh = () => mutate((k) => typeof k === "string" && k.startsWith("/api/"));
  const admin = me.role !== "executive";
  const viewingOther = !!as && data?.viewing && data.viewing.id !== me.id;

  const items = useMemo(() => {
    const all = data?.items ?? [];
    switch (filter) {
      case "college":
      case "deal":
        return all.filter((i) => i.kind === filter);
      case "overdue":
      case "today":
        return all.filter((i) => i.group === filter);
      case "awaiting":
        return all.filter((i) => i.stage === "rates_proposed" || i.stage === "proposal_sent");
      case "fests":
        return all.filter((i) => i.kind === "college" && i.fest?.startsWith(data!.today.slice(0, 7)));
      default:
        return all;
    }
  }, [data, filter]);

  if (error) return <div className="box err">Couldn't load your home page. {String(error.message)}</div>;
  if (!data) return <div className="box sub">Loading your day…</div>;

  const open = (i: QueueItem) => (i.kind === "college" ? setOpenCollege(i.id) : setOpenCompany(i.companyId));
  const focus = data.items.slice(0, 3);
  const first = (viewingOther ? data.viewing.name : me.name).split(" ")[0];
  const s = data.summary;
  const stat = (f: Filter, n: number, label: string, icon: keyof typeof ICONS, tone?: "r" | "w") => (
    <button className={`stat${filter === f ? " on" : ""}${n ? (tone ? ` ${tone}` : "") : " zero"}`} onClick={() => setFilter(filter === f ? "all" : f)} aria-pressed={filter === f}>
      <span className="ic">
        <Ic k={icon} />
      </span>
      <b>{n}</b>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="home">
      <header className="home-hero">
        <div>
          <h1>{viewingOther ? `${first}'s work` : `${greeting()}, ${first}`}</h1>
          <div className="date">{new Date(data.today + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
        {viewingOther && <button onClick={() => setAs(null)}>← Back to my work</button>}
      </header>

      <div className="stats">
        {stat("overdue", s.overdue, "Overdue", "alert", "r")}
        {stat("today", s.today, "Due today", "clock", "w")}
        {stat("fests", s.festsThisMonth, "Fests this month", "calendar")}
        {stat("awaiting", s.awaiting, "Awaiting reply", "reply")}
      </div>

      {focus.length > 0 && filter === "all" && (
        <section aria-label="Next focus">
          <div className="sec-head">
            <h2 className="sec">Next focus</h2>
          </div>
          <div className="focus">
            {focus.map((i) => (
              <article key={i.key} className={`focus-card lv-${i.level}`}>
                <div className="focus-top">
                  <Level level={i.level} />
                  <Dates i={i} />
                </div>
                <div>
                  <button className="lnk focus-title" onClick={() => open(i)}>
                    {i.title}
                  </button>
                  <div className="meta">
                    {i.sub} · {STAGE_LABEL[i.stage]}
                  </div>
                </div>
                <div className={`step${i.nextAction ? "" : " empty"}`}>
                  <small>Next step</small>
                  <p>{i.nextAction || "Nothing planned yet"}</p>
                </div>
                {i.reasons.length > 0 && (
                  <div className="chips">
                    {i.reasons.slice(0, 3).map((r) => (
                      <span key={r} className="chip">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
                <div className="focus-actions">
                  {i.phone ? (
                    <a href={`https://wa.me/${i.phone}`} target="_blank" rel="noopener noreferrer">
                      <button className="p btn-ic">
                        <Ic k="chat" size={16} /> WhatsApp
                      </button>
                    </a>
                  ) : (
                    <button className="p btn-ic grow" onClick={() => open(i)}>
                      <Ic k="open" size={16} /> Open
                    </button>
                  )}
                  <button className="ibtn" title="Mark the step done" aria-label={`Mark next step done for ${i.title}`} onClick={() => setStep({ item: i, mode: "done" })}>
                    <Ic k="check" />
                  </button>
                  <button className="ibtn" title="Snooze" aria-label={`Snooze ${i.title}`} onClick={() => setStep({ item: i, mode: "snooze" })}>
                    <Ic k="clock" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <TideLine fests={data.timeline} today={data.today} onOpen={setOpenCollege} />

      <section aria-label="My queue">
        <div className="sec-head">
          <h2 className="sec">
            {viewingOther ? "Queue" : "My queue"} <span className="count">{items.length}</span>
          </h2>
          <div className="seg pills">
            {(
              [
                ["all", "All"],
                ["college", "Colleges"],
                ["deal", "Sponsors"],
              ] as [Filter, string][]
            ).map(([k, l]) => (
              <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                {l}
              </button>
            ))}
            {!["all", "college", "deal"].includes(filter) && <button onClick={() => setFilter("all")}>✕ Clear</button>}
          </div>
        </div>
        {!items.length && (
          <div className="panel sub">
            {data.items.length ? "Nothing matches this filter." : viewingOther ? "Nothing open for this person." : "You're all caught up. Nothing assigned to you is open right now."}
          </div>
        )}
        {GROUPS.map(([g, label]) => {
          const L = items.filter((i) => i.group === g);
          if (!L.length) return null;
          return (
            <div key={g} className="qgroup">
              <h3 className={`qhead ${g}`}>
                <i />
                {label} <span className="count">{L.length}</span>
              </h3>
              <div className="qlist">
                {L.map((i) => (
                  <div key={i.key} className={`qrow lv-${i.level}`}>
                    <span className="qdot" title={LEVEL_LABEL[i.level]} />
                    <div style={{ minWidth: 0 }}>
                      <div className="qtitle">
                        <button className="lnk" onClick={() => open(i)}>
                          {i.title}
                        </button>
                        <span className="kind">{i.kind === "deal" ? "Sponsor" : "College"}</span>
                        <span className="sub">
                          {i.kind === "deal" ? i.sub.replace(/^Sponsor · /, "") : i.sub} · {STAGE_LABEL[i.stage]}
                        </span>
                      </div>
                      <div className={`qstep${i.nextAction ? "" : " empty"}`}>{i.nextAction || "No next step written"}</div>
                      {i.reasons.length > 0 && (
                        <div className="chips">
                          {i.reasons.slice(0, 3).map((r) => (
                            <span key={r} className="chip">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="qside">
                      <Dates i={i} />
                      <div className="qbtns">
                        <button className="ibtn sm" title="Mark the step done" aria-label={`Mark next step done for ${i.title}`} onClick={() => setStep({ item: i, mode: "done" })}>
                          <Ic k="check" size={16} />
                        </button>
                        <button className="ibtn sm" title="Snooze" aria-label={`Snooze ${i.title}`} onClick={() => setStep({ item: i, mode: "snooze" })}>
                          <Ic k="clock" size={16} />
                        </button>
                        <button className="ibtn sm" title="Open" aria-label={`Open ${i.title}`} onClick={() => open(i)}>
                          <Ic k="open" size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {admin && !viewingOther && data.team && (
        <section aria-label="Team">
          <div className="sec-head">
            <h2 className="sec">
              Team pulse <span className="count">{data.team.length}</span>
            </h2>
          </div>
          {!data.team.length ? (
            <div className="panel sub">No one has open work yet. Assign colleges from the Colleges page.</div>
          ) : (
            <div className="pulse">
              {data.team.map((t) => (
                <button key={t.id} className="pulse-card" onClick={() => setAs(t.id)} title={`See ${t.name}'s queue`}>
                  <span className="avatar">{initials(t.name)}</span>
                  <b>{t.name}</b>
                  <span className="sub">{t.open} open · tap to view</span>
                  <span className="pulse-stats">
                    <span className={t.overdue ? "r" : ""}>
                      <b>{t.overdue}</b>overdue
                    </span>
                    <span className={t.today ? "w" : ""}>
                      <b>{t.today}</b>today
                    </span>
                    <span className={t.urgent ? "r" : ""}>
                      <b>{t.urgent}</b>urgent
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {data.unassigned && data.unassigned.length > 0 && (
            <>
              <div className="sec-head">
                <h2 className="sec">
                  Needs an owner <span className="count">{data.unassigned.length}</span>
                </h2>
              </div>
              <div className="qlist">
                {data.unassigned.slice(0, ownersAll ? undefined : 6).map((u) => (
                  <div className="qrow lv-high" key={u.collegeId}>
                    <span className="qdot" />
                    <div style={{ minWidth: 0 }}>
                      <button className="lnk" onClick={() => setOpenCollege(u.collegeId)}>
                        {u.name}
                      </button>
                      <div className="sub">
                        {u.festName ? `${u.festName} · ` : "Fest "}
                        {fmtDate(u.fest)} · in {u.days} day{u.days === 1 ? "" : "s"} · {STAGE_LABEL[u.stage]}
                      </div>
                    </div>
                    <div className="qside">
                      <button className="p sm" onClick={() => setAssign({ id: u.collegeId, name: u.name, assignees: [], pitchCompany: "" } as unknown as CollegeRow)}>
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {data.unassigned.length > 6 && (
                <button className="sm" style={{ marginTop: 8 }} onClick={() => setOwnersAll((v) => !v)}>
                  {ownersAll ? "Show fewer" : `Show all ${data.unassigned.length}`}
                </button>
              )}
            </>
          )}

          {data.pipeline && (
            <>
              <div className="sec-head">
                <h2 className="sec">Pipeline</h2>
              </div>
              <div className="panel">
                <Funnel label="Colleges" stages={COLLEGE_STAGES as readonly string[]} counts={data.pipeline.colleges} />
                <Funnel label="Sponsor deals" stages={DEAL_STAGES as readonly string[]} counts={data.pipeline.deals} />
                <div className="locked-total">
                  <span className="sub">Locked so far</span>
                  <b>{inr(data.pipeline.lockedValue)}</b>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {step && (
        <NextStepModal
          target={{ kind: step.item.kind, id: step.item.id, stage: step.item.stage, title: step.item.title, nextAction: step.item.nextAction, nextActionDue: step.item.nextActionDue }}
          mode={step.mode}
          onClose={() => setStep(null)}
          onDone={() => {
            setStep(null);
            refresh();
          }}
        />
      )}
      {openCollege && <CollegeDrawer id={openCollege} me={me} onClose={() => setOpenCollege(null)} onChanged={refresh} onAssign={(c) => setAssign(c)} />}
      {openCompany && <CompanyDrawer id={openCompany} me={me} initialTab="deals" onClose={() => setOpenCompany(null)} onChanged={refresh} />}
      {assign && (
        <AssignModal
          college={assign}
          pitchOptions={[]}
          onClose={() => setAssign(null)}
          onDone={() => {
            setAssign(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

const Key = ({ cls, children }: { cls: string; children: ReactNode }) => (
  <span>
    <i className={cls} />
    {children}
  </span>
);

/** The next 60 days as a tide line: one dot per fest, red when it is close but still at an early stage. */
function TideLine({ fests, today, onOpen }: { fests: TimelineFest[]; today: string; onOpen: (id: number) => void }) {
  const marks = [0, 15, 30, 45, 60];
  const stack = new Map<number, number>();
  const short = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return (
    <section aria-label="Fests in the next 60 days" className="tide">
      <div className="tide-head">
        <h2 className="sec">
          Next 60 days <span className="count">{fests.length}</span>
        </h2>
        <span className="tide-key">
          <Key cls="behind">Early stage</Key>
          <Key cls="">In progress</Key>
          <Key cls="locked">Locked</Key>
        </span>
      </div>
      <div className="tide-track">
        <svg viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden className="tide-wave">
          <path d="M0 20 C 25 8, 50 8, 75 20 S 125 32, 150 20 S 200 8, 225 20 S 275 32, 300 20 S 350 8, 375 20 S 425 32, 450 20 S 500 8, 525 20 S 575 32, 600 20" />
        </svg>
        <span className="tide-today" aria-hidden />
        {fests.map((f) => {
          const bucket = Math.round(f.days / 2);
          const n = stack.get(bucket) ?? 0;
          stack.set(bucket, n + 1);
          const tone = f.stage === "locked" ? "locked" : f.behind ? "behind" : "";
          return (
            <button
              key={f.collegeId}
              className={`d ${tone}`}
              style={{ left: `${(f.days / 60) * 100}%`, top: `calc(50% - 8px + ${n * 17}px)` }}
              title={`${f.name} · fest ${fmtDate(f.fest)} · ${STAGE_LABEL[f.stage]}`}
              aria-label={`${f.name}, fest ${fmtDate(f.fest)}, ${STAGE_LABEL[f.stage]}`}
              onClick={() => onOpen(f.collegeId)}
            />
          );
        })}
        {marks.map((m, k) => (
          <span key={m} className={`tide-mark${k === 0 ? " first" : k === marks.length - 1 ? " last" : ""}`} style={{ left: `${(m / 60) * 100}%` }}>
            {m === 0 ? "Today" : short(addDays(today, m))}
          </span>
        ))}
      </div>
      {fests.length > 0 ? (
        <ol className="tide-list">
          {fests.slice(0, 6).map((f) => {
            const d = new Date(f.fest + "T00:00:00");
            return (
              <li key={f.collegeId}>
                <span className={`when${f.behind && f.stage !== "locked" ? " behind" : ""}`}>
                  <b>{d.getDate()}</b>
                  <span>{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                </span>
                <span style={{ minWidth: 0 }}>
                  <button className="lnk" onClick={() => onOpen(f.collegeId)}>
                    {f.name}
                  </button>
                  <div className="sub">
                    {f.days === 0 ? "Today" : `In ${f.days} day${f.days === 1 ? "" : "s"}`} · {STAGE_LABEL[f.stage]}
                  </div>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="sub" style={{ marginTop: 6 }}>
          No fests in the next 60 days.
        </div>
      )}
    </section>
  );
}

function Funnel({ label, stages, counts }: { label: string; stages: readonly string[]; counts: Record<string, number> }) {
  const total = stages.reduce((s, k) => s + (counts[k] ?? 0), 0);
  return (
    <div className="funnel">
      <div className="top" style={{ marginBottom: 6 }}>
        <b style={{ fontSize: 14 }}>{label}</b>
        <span className="sub">{total} total</span>
      </div>
      <div className="funnel-bar" role="img" aria-label={stages.map((k) => `${STAGE_LABEL[k]} ${counts[k] ?? 0}`).join(", ")}>
        {stages.map((k) => (counts[k] ? <span key={k} className={`fb-${k}`} style={{ flex: counts[k] }} title={`${STAGE_LABEL[k]}: ${counts[k]}`} /> : null))}
      </div>
      <div className="funnel-legend">
        {stages.map((k) => (
          <span key={k} className="sub">
            <i className={`fb-${k}`} />
            {STAGE_LABEL[k]} {counts[k] ?? 0}
          </span>
        ))}
      </div>
    </div>
  );
}
