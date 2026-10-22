"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher, initials, post } from "@/lib/client";
import { fmtRange } from "@/lib/format";
import { COLLEGE_STAGES, COLLEGE_STAGE_DESC, MONTHS, STAGE_LABEL, type CollegeStage } from "@/lib/stages";
import type { CollegeRow, Me, TeamUser } from "@/lib/types";
import { GeoFields } from "../GeoFields";
import { Modal, Seg, SelectField, Tag, TextField, useAction, useToast } from "../ui";
import { CollegeDrawer } from "./CollegeDrawer";
import { MoveDialog, NEEDS_FORM } from "./MoveDialog";

type Filters = { q: string; month: string; agency: string; assignee: string; stage: string; budget: string; days: string };
const EMPTY: Filters = { q: "", month: "", agency: "", assignee: "", stage: "", budget: "", days: "" };

export const stageTone = (s: string) => (s === "locked" ? "g" : s === "lost" ? "r" : undefined);
const isAdm = (me: Me) => me.role !== "executive";

export function CollegesView({ me }: { me: Me }) {
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const { mutate } = useSWRConfig();
  const [mode, setMode] = useState<"list" | "board">("list");
  const [tab, setTab] = useState<"mine" | "all">(isAdm(me) ? "all" : "mine");
  const [f, setF] = useState<Filters>(EMPTY);
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [modal, setModal] = useState<"add" | "import" | null>(null);
  const [assign, setAssign] = useState<CollegeRow | null>(null);
  const [move, setMove] = useState<{ college: CollegeRow; to: CollegeStage } | null>(null);

  useEffect(() => {
    try {
      const m = localStorage.getItem("lw_college_mode");
      if (m === "board" || m === "list") setMode(m);
    } catch {}
  }, []);
  useEffect(() => {
    const o = Number(sp.get("open"));
    if (o) {
      setOpenId(o);
      router.replace("/colleges");
    }
  }, [sp, router]);
  useEffect(() => {
    const t = setTimeout(() => setF((p) => ({ ...p, q })), 250);
    return () => clearTimeout(t);
  }, [q]);

  const key = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
    if (isAdm(me)) p.set("tab", tab);
    return `/api/colleges?${p}`;
  }, [f, tab, me]);
  const { data, error, isLoading } = useSWR<CollegeRow[]>(key, fetcher, { keepPreviousData: true });
  const { data: team } = useSWR<TeamUser[]>(isAdm(me) ? "/api/users" : null, fetcher);
  const { data: all } = useSWR<CollegeRow[]>("/api/colleges?tab=all", fetcher);
  const agencies = useMemo(() => [...new Set((all ?? []).map((c) => c.previousAgency).filter(Boolean))].sort(), [all]);
  const pitchOptions = useMemo(() => [...new Set(["Luna Wave", ...(all ?? []).map((c) => c.pitchCompany)].filter(Boolean))].sort(), [all]);
  // colleges, sponsors and the roster share data (history creates companies and shows), so refresh every list after a save
  const refresh = () => mutate((k) => typeof k === "string" && k.startsWith("/api/"));

  const rows = data ?? [];
  const active = Object.entries(f).filter(([, v]) => v).length;
  const set = (k: keyof Filters, v: string) => setF((p) => ({ ...p, [k]: v }));

  function setView(m: "list" | "board") {
    setMode(m);
    try {
      localStorage.setItem("lw_college_mode", m);
    } catch {}
  }

  /** Moves a deal. Stages that need captured details open a dialog first. */
  async function requestMove(c: CollegeRow, to: CollegeStage) {
    if (c.stage === to) return;
    const fromIdx = COLLEGE_STAGES.indexOf(c.stage as CollegeStage);
    const forward = COLLEGE_STAGES.indexOf(to) > fromIdx && c.stage !== "locked" && c.stage !== "lost";
    if (to === "lost" || (forward && NEEDS_FORM.includes(to))) {
      setMove({ college: c, to });
      return;
    }
    try {
      await post(`/api/colleges/${c.id}/stage`, { to });
      toast(`Moved to ${STAGE_LABEL[to]}`);
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't move", true);
    }
  }
  const step = (c: CollegeRow, d: number) => {
    const i = COLLEGE_STAGES.indexOf(c.stage as CollegeStage) + d;
    if (i >= 0 && i < COLLEGE_STAGES.length) requestMove(c, COLLEGE_STAGES[i]);
  };

  const Assignees = ({ c }: { c: CollegeRow }) =>
    c.assignees.length ? (
      <>
        {c.assignees.map((a) => (
          <span key={a.id} className="av" title={a.name}>
            {initials(a.name)}
          </span>
        ))}
      </>
    ) : (
      <span className="sub">Unassigned</span>
    );

  return (
    <>
      <div className="top">
        <h2>
          Colleges <span className="sub">{rows.length}</span>
        </h2>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="p" onClick={() => setModal("add")}>
            + Add college
          </button>
          {isAdm(me) && <button onClick={() => setModal("import")}>Import CSV</button>}
        </div>
      </div>
      <div className="seg">
        {isAdm(me) ? (
          <Seg value={tab} onChange={setTab} items={[["mine", "My colleges"], ["all", "All colleges"]]} />
        ) : (
          <button className="on" aria-disabled>
            My colleges
          </button>
        )}
        <span style={{ flex: 1 }} />
        <Seg value={mode} onChange={setView} items={[["list", "List"], ["board", "Board"]]} />
      </div>

      <div className={`bar${showFilters ? "" : " collapsed"}`}>
        <input aria-label="Search" placeholder="Search college, city, fest" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Fest month" value={f.month} onChange={(e) => set("month", e.target.value)}>
          <option value="">Fest month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>
        <select aria-label="Previous company" value={f.agency} onChange={(e) => set("agency", e.target.value)}>
          <option value="">Previous company</option>
          {agencies.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select aria-label="Assignee" value={f.assignee} onChange={(e) => set("assignee", e.target.value)}>
          <option value="">Assignee</option>
          <option value="me">Assigned to me</option>
          <option value="none">Unassigned</option>
          {(team ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select aria-label="Stage" value={f.stage} onChange={(e) => set("stage", e.target.value)}>
          <option value="">Stage</option>
          {COLLEGE_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
        <select aria-label="Budget" value={f.budget} onChange={(e) => set("budget", e.target.value)}>
          <option value="">Budget</option>
          <option value="1">Under ₹5L</option>
          <option value="2">₹5L–20L</option>
          <option value="3">₹20L+</option>
        </select>
        <select aria-label="Days" value={f.days} onChange={(e) => set("days", e.target.value)}>
          <option value="">Days</option>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <option key={d} value={d}>
              {d} day{d > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, margin: "-4px 0 12px", flexWrap: "wrap" }}>
        <button className="filters-toggle" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
          {showFilters ? "Hide filters" : "Filters"}
          {active ? ` (${active})` : ""}
        </button>
        {active > 0 && (
          <button
            onClick={() => {
              setF(EMPTY);
              setQ("");
            }}
          >
            ✕ Clear all filters ({active})
          </button>
        )}
      </div>

      {error && <div className="box err">Couldn't load colleges. {String(error.message)}</div>}
      {isLoading && !data && <div className="box sub">Loading colleges…</div>}
      {data && !rows.length && (
        <div className="box">
          No colleges match. {tab === "mine" && isAdm(me) ? "Try All colleges, or " : !isAdm(me) ? "Ask an admin to assign colleges to you, or " : ""}clear a filter.
        </div>
      )}

      {mode === "list" && rows.length > 0 && (
        <>
          <div className="row h">
            <span>College</span>
            <span>Fest type</span>
            <span>Month</span>
            <span>Stage</span>
            <span>Assigned to</span>
            <span />
          </div>
          {rows.map((c) => (
            <div className="row" key={c.id}>
              <div>
                <button className="lnk" onClick={() => setOpenId(c.id)}>
                  {c.name}
                </button>
                <div className="sub">
                  {c.city}
                  {c.state ? `, ${c.state}` : ""}
                </div>
              </div>
              <span>
                <Tag>{c.festType[0].toUpperCase() + c.festType.slice(1)}</Tag>
                <div className="sub" style={{ marginTop: 4 }}>
                  {c.festName ? `${c.festName} · ` : ""}
                  {c.days}-day
                </div>
              </span>
              <span>
                {MONTHS[c.festMonth]} {c.festYear}
                {c.festStart && <div className="sub">{fmtRange(c.festStart, c.festEnd)}</div>}
              </span>
              <span>
                <Tag tone={stageTone(c.stage)}>{STAGE_LABEL[c.stage]}</Tag>
              </span>
              <span>
                {isAdm(me) ? (
                  <button className="lnk" onClick={() => setAssign(c)} title="Assign" style={{ fontWeight: 400 }}>
                    <Assignees c={c} /> <Tag>▾</Tag>
                  </button>
                ) : (
                  <Assignees c={c} />
                )}
                {c.pitchCompany && <div className="sub" style={{ marginTop: 4 }}>as {c.pitchCompany}</div>}
              </span>
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {c.convenorPhone && (
                  <>
                    <a href={`https://wa.me/${c.convenorPhone}`} target="_blank" rel="noopener noreferrer">
                      <button>WhatsApp</button>
                    </a>
                    <a href={`tel:+${c.convenorPhone}`}>
                      <button>Call</button>
                    </a>
                  </>
                )}
                <button onClick={() => setOpenId(c.id)}>{c.convenorPhone ? "Open" : "Open · add number"}</button>
              </span>
            </div>
          ))}
        </>
      )}

      {mode === "board" && rows.length > 0 && (
        <div className="kan">
          {COLLEGE_STAGES.map((s) => {
            const L = rows.filter((c) => c.stage === s);
            return (
              <div
                key={s}
                className="col"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("over");
                }}
                onDragLeave={(e) => e.currentTarget.classList.remove("over")}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("over");
                  const c = rows.find((x) => x.id === Number(e.dataTransfer.getData("text/plain")));
                  if (c) requestMove(c, s);
                }}
              >
                <h3>
                  {STAGE_LABEL[s]} <span className="sub">{L.length}</span>
                </h3>
                <div className="sub" style={{ padding: "0 4px 8px" }}>
                  {COLLEGE_STAGE_DESC[s]}
                </div>
                {L.map((c) => (
                  <div key={c.id} className="card" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(c.id))} onClick={() => setOpenId(c.id)}>
                    <b>{c.name}</b>
                    <div className="sub">
                      {c.festName} · {MONTHS[c.festMonth]}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <Assignees c={c} />
                    </div>
                    <div className="mv" onClick={(e) => e.stopPropagation()}>
                      <button aria-label="Move back" disabled={!isAdm(me)} title={isAdm(me) ? "Move back" : "Only an admin can move a deal backward"} onClick={() => step(c, -1)}>
                        ◀
                      </button>
                      <button aria-label="Move forward" onClick={() => step(c, 1)}>
                        ▶
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {openId && <CollegeDrawer id={openId} me={me} onClose={() => setOpenId(null)} onChanged={refresh} onAssign={(c) => setAssign(c)} />}
      {move && (
        <MoveDialog
          college={move.college}
          to={move.to}
          onClose={() => setMove(null)}
          onDone={() => {
            setMove(null);
            refresh();
          }}
        />
      )}
      {modal === "add" && (
        <AddCollege
          onClose={() => setModal(null)}
          onDone={(id) => {
            setModal(null);
            refresh();
            setOpenId(id);
          }}
        />
      )}
      {modal === "import" && (
        <ImportCsv
          onClose={() => setModal(null)}
          onDone={() => {
            refresh();
          }}
        />
      )}
      {assign && (
        <AssignModal
          college={assign}
          pitchOptions={pitchOptions}
          onClose={() => setAssign(null)}
          onDone={() => {
            setAssign(null);
            refresh();
          }}
        />
      )}
    </>
  );
}

function AddCollege({ onClose, onDone }: { onClose: () => void; onDone: (id: number) => void }) {
  const [f, setF] = useState({ name: "", city: "", state: "", festMonth: "", festYear: "", festStart: "", days: 2, festType: "cultural", festName: "" });
  const { busy, error, run } = useAction();
  const set = (k: keyof typeof f, v: string | number) => setF((p) => ({ ...p, [k]: v }));
  const y = new Date().getFullYear();
  return (
    <Modal onClose={onClose} title="Add college" wide>
      <div className="fl">
        <TextField full label="College name" value={f.name} onChange={(v) => set("name", v)} />
        <GeoFields state={f.state} city={f.city} onChange={(s, c) => setF((p) => ({ ...p, state: s, city: c }))} />
        <TextField label="Fest name" value={f.festName} onChange={(v) => set("festName", v)} />
        <SelectField label="Fest type" value={f.festType} onChange={(v) => set("festType", v)} options={[["cultural", "Cultural"], ["technical", "Technical"], ["other", "Other"]]} />
        <SelectField label="Expected month" value={f.festMonth} onChange={(v) => set("festMonth", v)} options={[["", "Select month"], ...MONTHS.map((m, i) => [String(i), m] as [string, string])]} />
        <SelectField label="Fest year" value={f.festYear} onChange={(v) => set("festYear", v)} options={[["", "Auto (next fest)"], ...[0, 1, 2].map((k) => [String(y + k), String(y + k)] as [string, string])]} />
        <TextField type="date" label="Exact start date (optional)" value={f.festStart} onChange={(v) => set("festStart", v)} />
        <SelectField label="Number of days" value={f.days} onChange={(v) => set("days", +v)} options={[1, 2, 3, 4, 5, 6, 7].map((n) => [n, `${n} day${n > 1 ? "s" : ""}`] as [number, string])} />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <button
        className="p"
        style={{ width: "100%", marginTop: 14 }}
        disabled={busy}
        onClick={async () => {
          let id = 0;
          const ok = await run(async () => {
            if (!f.name.trim()) throw new Error("Enter the college name");
            if (!f.city.trim()) throw new Error("Pick a state and city (use Other to type a city that isn't listed)");
            if (f.festMonth === "" && !f.festStart) throw new Error("Pick the expected month or an exact start date");
            const r = await post<{ id: number }>("/api/colleges", {
              name: f.name,
              city: f.city,
              state: f.state,
              festName: f.festName,
              festType: f.festType,
              festMonth: f.festMonth === "" ? null : +f.festMonth,
              festYear: f.festYear ? +f.festYear : undefined,
              festStart: f.festStart || null,
              days: f.days,
            });
            id = r.id;
          }, "College added");
          if (ok) onDone(id);
        }}
      >
        {busy ? "Adding…" : "Add college"}
      </button>
    </Modal>
  );
}

function ImportCsv({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [csv, setCsv] = useState("");
  const [res, setRes] = useState<{ added: number; duplicates: string[]; notImported: string[] } | null>(null);
  const { busy, error, run } = useAction();
  return (
    <Modal onClose={onClose} title="Import colleges" wide>
      {res ? (
        <>
          <p>
            <Tag tone="g">{res.added} added</Tag> <Tag tone="w">{res.duplicates.length} duplicates skipped</Tag> <Tag tone="r">{res.notImported.length} not imported</Tag>
          </p>
          {res.duplicates.length > 0 && <p className="sub">Duplicates: {res.duplicates.slice(0, 8).join(", ")}{res.duplicates.length > 8 ? "…" : ""}</p>}
          {res.notImported.length > 0 && (
            <p className="sub">
              {res.notImported.slice(0, 6).map((l) => (
                <span key={l}>
                  {l}
                  <br />
                </span>
              ))}
              {res.notImported.length > 6 ? "…" : ""}
            </p>
          )}
          <button className="p" onClick={onClose}>
            Done
          </button>
        </>
      ) : (
        <>
          <p className="sub" style={{ marginTop: 0 }}>
            Columns in this order: College Name, City, State, Month or Date, Days, Fest Type. A header row is optional and columns are matched by name. Duplicates are skipped.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) file.text().then(setCsv);
            }}
          />
          <textarea rows={7} style={{ marginTop: 8 }} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={"College Name,City,State,Month,Days,Fest Type\nJadavpur University,Kolkata,West Bengal,Feb,3,Cultural"} />
          {error && <p className="err" role="alert">{error}</p>}
          <button
            className="p"
            style={{ marginTop: 10 }}
            disabled={busy || !csv.trim()}
            onClick={() =>
              run(async () => {
                setRes(await post("/api/colleges/import", { csv }));
                onDone();
              })
            }
          >
            {busy ? "Importing…" : "Import"}
          </button>
        </>
      )}
    </Modal>
  );
}

function AssignModal({ college, pitchOptions, onClose, onDone }: { college: CollegeRow; pitchOptions: string[]; onClose: () => void; onDone: () => void }) {
  const { data: team } = useSWR<TeamUser[]>("/api/users", fetcher);
  const [sel, setSel] = useState<number[]>(college.assignees.map((a) => a.id));
  const [pitch, setPitch] = useState(college.pitchCompany ?? "");
  const [s, setS] = useState("");
  const { busy, error, run } = useAction();
  const list = (team ?? []).filter((u) => (u.active || sel.includes(u.id)) && u.name.toLowerCase().includes(s.toLowerCase()));
  return (
    <Modal onClose={onClose} title={`Assign ${college.name}`}>
      <input aria-label="Search team" placeholder="Search team" value={s} onChange={(e) => setS(e.target.value)} />
      <div className="pick">
        {list.map((u) => (
          <label key={u.id}>
            <input type="checkbox" checked={sel.includes(u.id)} onChange={(e) => setSel((p) => (e.target.checked ? [...p, u.id] : p.filter((x) => x !== u.id)))} />
            {u.name} <Tag>{u.role.replace("_", " ")}</Tag>
            {!u.active && <Tag tone="r">revoked</Tag>}
          </label>
        ))}
      </div>
      <TextField full label="Pitching as (company name we use for this college)" value={pitch} onChange={setPitch} list="pitch-companies" ph="Luna Wave" />
      <datalist id="pitch-companies">
        {pitchOptions.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </datalist>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="p" style={{ width: "100%", marginTop: 12 }} disabled={busy} onClick={async () => (await run(() => post(`/api/colleges/${college.id}/assign`, { userIds: sel, pitchCompany: pitch.trim() }), "Assignment saved")) && onDone()}>
        Save assignment
      </button>
    </Modal>
  );
}

