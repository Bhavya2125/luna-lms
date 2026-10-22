"use client";
import { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/client";
import { fmtDate, inr } from "@/lib/format";
import type { HomeData, QueueItem, TimelineFest } from "@/lib/home";
import { LEVEL_LABEL } from "@/lib/priority";
import { COLLEGE_STAGES, DEAL_STAGES, STAGE_LABEL } from "@/lib/stages";
import type { CollegeRow, Me } from "@/lib/types";
import { CollegeDrawer } from "../colleges/CollegeDrawer";
import { AssignModal } from "../colleges/CollegesView";
import { DueTag, NextStepModal, TargetTag } from "../NextStep";
import { CompanyDrawer } from "../sponsors/CompanyDrawer";
import { Tag } from "../ui";

type Filter = "all" | "college" | "deal" | "overdue" | "today" | "fests" | "awaiting";
const GROUPS: [QueueItem["group"], string][] = [
  ["overdue", "Overdue"],
  ["today", "Today"],
  ["week", "This week"],
  ["later", "Later"],
];
const levelTone = (l: QueueItem["level"]) => (l === "urgent" ? "r" : l === "high" ? "w" : undefined);

function greeting() {
  const h = new Date(Date.now() + 5.5 * 3600e3).getUTCHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

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
  const chip = (f: Filter, n: number, label: string, tone?: string) => (
    <button className={`stat${filter === f ? " on" : ""}${tone ? ` ${tone}` : ""}`} onClick={() => setFilter(filter === f ? "all" : f)} aria-pressed={filter === f}>
      <b>{n}</b>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="home">
      <div className="home-hero">
        <div>
          <h1>{viewingOther ? `${first}'s work` : `${greeting()}, ${first}`}</h1>
          <div className="sub">{new Date(data.today + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
        {viewingOther && <button onClick={() => setAs(null)}>Back to my work</button>}
      </div>

      <div className="stats">
        {chip("overdue", s.overdue, "Overdue", s.overdue ? "r" : "")}
        {chip("today", s.today, "Due today", s.today ? "w" : "")}
        {chip("fests", s.festsThisMonth, "Fests this month")}
        {chip("awaiting", s.awaiting, "Awaiting reply")}
      </div>

      {focus.length > 0 && filter === "all" && (
        <section aria-label="Next focus">
          <h2 className="sec">Next focus</h2>
          <div className="focus">
            {focus.map((i) => (
              <article key={i.key} className={`focus-card lv-${i.level}`}>
                <div className="top" style={{ marginBottom: 6 }}>
                  <Tag tone={levelTone(i.level)}>{LEVEL_LABEL[i.level]}</Tag>
                  <span style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <DueTag due={i.nextActionDue} />
                    <TargetTag date={i.targetDate} />
                  </span>
                </div>
                <button className="lnk focus-title" onClick={() => open(i)}>
                  {i.title}
                </button>
                <div className="sub">
                  {i.sub} · {STAGE_LABEL[i.stage]}
                </div>
                <p className="focus-step">{i.nextAction || "No next step written yet"}</p>
                {i.reasons.length > 0 && <div className="why">{i.reasons.slice(0, 3).join(" · ")}</div>}
                <div className="focus-actions">
                  {i.phone ? (
                    <a href={`https://wa.me/${i.phone}`} target="_blank" rel="noopener noreferrer">
                      <button className="p">WhatsApp</button>
                    </a>
                  ) : (
                    <button className="p" onClick={() => open(i)}>
                      Open
                    </button>
                  )}
                  <button onClick={() => setStep({ item: i, mode: "done" })}>✓ Done</button>
                  <button onClick={() => setStep({ item: i, mode: "snooze" })}>Snooze</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <TideLine fests={data.timeline} onOpen={setOpenCollege} />

      <section aria-label="My queue">
        <div className="top" style={{ marginTop: 18, marginBottom: 8 }}>
          <h2 className="sec" style={{ margin: 0 }}>
            {viewingOther ? "Queue" : "My queue"} <span className="sub">{items.length}</span>
          </h2>
          <div className="seg" style={{ margin: 0 }}>
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
          <div className="box">
            {data.items.length ? "Nothing matches this filter." : viewingOther ? "Nothing open for this person." : "You're all caught up. Nothing assigned to you is open right now."}
          </div>
        )}
        {GROUPS.map(([g, label]) => {
          const L = items.filter((i) => i.group === g);
          if (!L.length) return null;
          return (
            <div key={g} className="qgroup">
              <h3 className={`qhead ${g}`}>
                {label} <span className="sub">{L.length}</span>
              </h3>
              {L.map((i) => (
                <div key={i.key} className={`qrow lv-${i.level}`}>
                  <div className="qmain">
                    <button className="lnk" onClick={() => open(i)}>
                      {i.title}
                    </button>{" "}
                    <span className="sub">
                      {i.kind === "deal" ? i.sub : i.sub || "College"} · {STAGE_LABEL[i.stage]}
                    </span>
                    <div className="qstep">{i.nextAction || <span className="sub">No next step written</span>}</div>
                    {i.reasons.length > 0 && <div className="why">{i.reasons.slice(0, 2).join(" · ")}</div>}
                  </div>
                  <div className="qside">
                    <span style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <DueTag due={i.nextActionDue} />
                      <TargetTag date={i.targetDate} />
                    </span>
                    <div className="qbtns">
                      <button className="sm" aria-label={`Mark next step done for ${i.title}`} onClick={() => setStep({ item: i, mode: "done" })}>
                        ✓
                      </button>
                      <button className="sm" onClick={() => setStep({ item: i, mode: "snooze" })}>
                        Snooze
                      </button>
                      <button className="sm" onClick={() => open(i)}>
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </section>

      {admin && !viewingOther && data.team && (
        <section aria-label="Team">
          <h2 className="sec">Team pulse</h2>
          {!data.team.length ? (
            <div className="box sub">No one has open work yet. Assign colleges from the Colleges page.</div>
          ) : (
            <div className="pulse">
              {data.team.map((t) => (
                <button key={t.id} className="pulse-card" onClick={() => setAs(t.id)} title={`See ${t.name}'s queue`}>
                  <b>{t.name}</b>
                  <span className="sub">{t.open} open</span>
                  <span className="pulse-n">
                    {t.overdue > 0 && <Tag tone="r">{t.overdue} overdue</Tag>} {t.today > 0 && <Tag tone="w">{t.today} today</Tag>} {t.urgent > 0 && <Tag>{t.urgent} urgent</Tag>}
                    {!t.overdue && !t.today && !t.urgent && <Tag tone="g">On track</Tag>}
                  </span>
                </button>
              ))}
            </div>
          )}

          {data.unassigned && data.unassigned.length > 0 && (
            <>
              <h2 className="sec">Needs an owner</h2>
              {data.unassigned.map((u) => (
                <div className="qrow lv-high" key={u.collegeId}>
                  <div className="qmain">
                    <button className="lnk" onClick={() => setOpenCollege(u.collegeId)}>
                      {u.name}
                    </button>
                    <div className="sub">
                      Fest {fmtDate(u.fest)} · in {u.days} day{u.days === 1 ? "" : "s"} · {STAGE_LABEL[u.stage]}
                    </div>
                  </div>
                  <div className="qside">
                    <button className="sm p" onClick={() => setAssign({ id: u.collegeId, name: u.name, assignees: [], pitchCompany: "" } as unknown as CollegeRow)}>
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {data.pipeline && (
            <>
              <h2 className="sec">Pipeline</h2>
              <div className="box">
                <Funnel label="Colleges" stages={COLLEGE_STAGES as readonly string[]} counts={data.pipeline.colleges} />
                <Funnel label="Sponsor deals" stages={DEAL_STAGES as readonly string[]} counts={data.pipeline.deals} />
                <div className="sub" style={{ marginTop: 8 }}>
                  Locked so far: <b>{inr(data.pipeline.lockedValue)}</b>
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

/** The next 60 days as a tide line: one dot per fest, red when it is close but still at an early stage. */
function TideLine({ fests, onOpen }: { fests: TimelineFest[]; onOpen: (id: number) => void }) {
  const marks = [0, 15, 30, 45, 60];
  const stack = new Map<number, number>();
  return (
    <section aria-label="Fests in the next 60 days" className="tide box">
      <div className="top" style={{ marginBottom: 4 }}>
        <h2 className="sec" style={{ margin: 0 }}>
          Next 60 days <span className="sub">{fests.length} fest{fests.length === 1 ? "" : "s"}</span>
        </h2>
        <span className="sub tide-key">
          <i className="d behind" /> early stage <i className="d" /> in progress <i className="d locked" /> locked
        </span>
      </div>
      <div className="tide-track">
        <svg viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden className="tide-wave">
          <path d="M0 20 C 25 8, 50 8, 75 20 S 125 32, 150 20 S 200 8, 225 20 S 275 32, 300 20 S 350 8, 375 20 S 425 32, 450 20 S 500 8, 525 20 S 575 32, 600 20" />
        </svg>
        {fests.map((f) => {
          const bucket = Math.round(f.days / 2);
          const n = stack.get(bucket) ?? 0;
          stack.set(bucket, n + 1);
          const tone = f.stage === "locked" ? "locked" : f.behind ? "behind" : "";
          return (
            <button
              key={f.collegeId}
              className={`d ${tone}`}
              style={{ left: `${(f.days / 60) * 100}%`, top: `calc(50% - 7px + ${n * 15}px)` }}
              title={`${f.name} · fest ${fmtDate(f.fest)} · ${STAGE_LABEL[f.stage]}`}
              aria-label={`${f.name}, fest ${fmtDate(f.fest)}, ${STAGE_LABEL[f.stage]}`}
              onClick={() => onOpen(f.collegeId)}
            />
          );
        })}
        {marks.map((m) => (
          <span key={m} className="tide-mark" style={{ left: `${(m / 60) * 100}%` }}>
            {m === 0 ? "Today" : `${m}d`}
          </span>
        ))}
      </div>
      {fests.length > 0 ? (
        <ol className="tide-list">
          {fests.slice(0, 5).map((f) => (
            <li key={f.collegeId}>
              <button className="lnk" onClick={() => onOpen(f.collegeId)}>
                {f.name}
              </button>{" "}
              <span className="sub">
                {fmtDate(f.fest)} · {f.days === 0 ? "today" : `in ${f.days}d`} · {STAGE_LABEL[f.stage]}
              </span>
            </li>
          ))}
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
  const total = stages.reduce((s, k) => s + (counts[k] ?? 0), 0) || 1;
  return (
    <div className="funnel">
      <div className="sub" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div className="funnel-bar" role="img" aria-label={stages.map((k) => `${STAGE_LABEL[k]} ${counts[k] ?? 0}`).join(", ")}>
        {stages.map((k) => (counts[k] ? <span key={k} className={`fb fb-${k}`} style={{ flex: counts[k] / total }} title={`${STAGE_LABEL[k]}: ${counts[k]}`} /> : null))}
      </div>
      <div className="funnel-legend">
        {stages.map((k) => (
          <span key={k} className="sub">
            <i className={`fb fb-${k}`} /> {STAGE_LABEL[k]} {counts[k] ?? 0}
          </span>
        ))}
      </div>
    </div>
  );
}
