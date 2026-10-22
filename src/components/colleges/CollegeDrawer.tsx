"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher, patch, post } from "@/lib/client";
import { fmtDateTime, fmtRange, inr, normPhone } from "@/lib/format";
import { COLLEGE_STAGES, COLLEGE_STAGE_DESC, FEST_TYPES, MONTHS, STAGE_LABEL, type CollegeStage } from "@/lib/stages";
import type { CollegeDetail, CollegeRow, Me } from "@/lib/types";
import { GeoFields } from "../GeoFields";
import { Drawer, Field, NumField, Seg, SelectField, Tag, TextField, useAction, useToast } from "../ui";
import { HistoryTabs } from "./HistoryTabs";
import { MoveDialog, NEEDS_FORM } from "./MoveDialog";

const tone = (s: string) => (s === "locked" ? "g" : s === "lost" ? "r" : undefined);

export function CollegeDrawer({ id, me, onClose, onChanged, onAssign }: { id: number; me: Me; onClose: () => void; onChanged: () => void; onAssign: (c: CollegeRow) => void }) {
  const key = `/api/colleges/${id}`;
  const { data, error, mutate } = useSWR<CollegeDetail>(key, fetcher);
  const [tab, setTab] = useState<"deal" | "details" | "hist">("deal");
  const [move, setMove] = useState<CollegeStage | null>(null);
  const admin = me.role !== "executive";
  const reload = () => {
    mutate();
    onChanged();
  };

  if (error) {
    return (
      <Drawer onClose={onClose} title="College">
        <div className="box err">{String(error.message)}</div>
      </Drawer>
    );
  }
  if (!data) {
    return (
      <Drawer onClose={onClose} title="Loading…">
        <div className="sub">Loading college…</div>
      </Drawer>
    );
  }
  const c = data.college;
  const phoneLinks = (p: string) =>
    p ? (
      <>
        <a href={`https://wa.me/${p}`} target="_blank" rel="noopener noreferrer"><button className="sm">WhatsApp</button></a>{" "}
        <a href={`tel:+${p}`}><button className="sm">Call</button></a>
      </>
    ) : null;

  return (
    <Drawer
      onClose={onClose}
      title={c.name}
      sub={`${c.festType[0].toUpperCase() + c.festType.slice(1)} fest${c.festName ? " · " + c.festName : ""} · ${c.city}${c.state ? ", " + c.state : ""} · ${MONTHS[c.festMonth]} ${c.festYear} · ${c.days}-day`}
    >
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {c.convenorPhone ? phoneLinks(c.convenorPhone) : <button className="sm" onClick={() => setTab("details")}>Add convenor number</button>}
      </div>
      <div style={{ marginTop: 12 }}>
        <Seg value={tab} onChange={setTab} items={[["deal", "Deal"], ["details", "Details"], ["hist", "History"]]} />
      </div>

      {tab === "deal" && <DealTab detail={data} admin={admin} onMove={(to) => setMove(to)} reload={reload} onAssign={() => onAssign({ ...c, assignees: data.assignees, previousAgency: "" })} phoneLinks={phoneLinks} />}
      {tab === "details" && <DetailsTab college={c} reload={reload} />}
      {tab === "hist" && <HistoryTabs detail={data} canEdit reload={reload} />}

      {move && (
        <MoveDialog
          college={c}
          to={move}
          onClose={() => setMove(null)}
          onDone={() => {
            setMove(null);
            reload();
          }}
        />
      )}
    </Drawer>
  );
}

function DealTab({ detail, admin, onMove, reload, onAssign, phoneLinks }: { detail: CollegeDetail; admin: boolean; onMove: (to: CollegeStage) => void; reload: () => void; onAssign: () => void; phoneLinks: (p: string) => React.ReactNode }) {
  const c = detail.college;
  const toast = useToast();
  const idx = COLLEGE_STAGES.indexOf(c.stage as CollegeStage);
  const closed = c.stage === "locked" || c.stage === "lost";
  const next = !closed && idx < 3 ? COLLEGE_STAGES[idx + 1] : null;
  const [note, setNote] = useState("");
  const { busy, run } = useAction();

  async function direct(to: CollegeStage) {
    try {
      await post(`/api/colleges/${c.id}/stage`, { to });
      toast(`Moved to ${STAGE_LABEL[to]}`);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't move", true);
    }
  }
  function request(to: CollegeStage) {
    if (to === c.stage) return;
    const forward = COLLEGE_STAGES.indexOf(to) > idx && !closed;
    if (to === "lost" || (forward && NEEDS_FORM.includes(to))) onMove(to);
    else direct(to);
  }

  return (
    <>
      <div className="steps" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} className={i <= (closed ? 5 : idx) ? "d" : ""} />
        ))}
      </div>
      <p>
        <Tag tone={tone(c.stage)}>{STAGE_LABEL[c.stage]}</Tag>{" "}
        <span className="sub">
          Assigned: {detail.assignees.map((a) => a.name).join(", ") || "nobody"} · Pitching as: {c.pitchCompany || "not set"}{" "}
          {admin && (
            <button className="lnk" style={{ fontWeight: 400, textDecoration: "underline" }} onClick={onAssign}>
              change
            </button>
          )}
        </span>
      </p>
      <p className="sub">
        Convenor: {c.convenorName || "not added"} {phoneLinks(c.convenorPhone)} · Faculty: {c.facultyName || "not added"} {phoneLinks(c.facultyPhone)}
      </p>

      <div className="box">
        <h3>{STAGE_LABEL[c.stage]}</h3>
        <p className="sub">{COLLEGE_STAGE_DESC[c.stage as CollegeStage]}{c.stage === "lost" && c.lostReason ? ` Reason: ${c.lostReason}.` : ""}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {next && (
            <button className="p" onClick={() => request(next)}>
              Move to {STAGE_LABEL[next]} →
            </button>
          )}
          {!closed && idx === 3 && (
            <button className="p" onClick={() => request("locked")}>
              Mark locked
            </button>
          )}
          {!closed && <button onClick={() => request("lost")}>Mark lost</button>}
          {closed && (admin ? <button onClick={() => direct("rates_proposed")}>Reopen deal</button> : <span className="sub">Only an admin can reopen a closed deal.</span>)}
        </div>
      </div>

      <div className="box">
        <label className="f">
          Move to any stage {admin ? "" : "(forward only)"}
          <select value={c.stage} onChange={(e) => request(e.target.value as CollegeStage)}>
            {COLLEGE_STAGES.map((s, i) => (
              <option key={s} value={s} disabled={!admin && (closed || i < idx)}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(c.artistBudget > 0 || c.prodBudget > 0 || c.proposedArtistRate > 0 || c.proposedProdRate > 0 || c.dealAmount > 0) && (
        <div className="box">
          <h3>Captured so far</h3>
          <div className="sub" style={{ marginTop: 6, display: "grid", gap: 2 }}>
            {(c.artistBudget > 0 || c.prodBudget > 0) && <span>Budget: artists {inr(c.artistBudget)} · production {inr(c.prodBudget)}</span>}
            {c.wishlist && <span>Wishlist: {c.wishlist}</span>}
            {c.scopeNotes && <span>Scope: {c.scopeNotes}</span>}
            {(c.proposedArtistRate > 0 || c.proposedProdRate > 0) && <span>Proposed: artists {inr(c.proposedArtistRate)} · production {inr(c.proposedProdRate)}{c.proposalNotes ? ` · ${c.proposalNotes}` : ""}</span>}
            {c.dealAmount > 0 && <span>Final: <b>{inr(c.dealAmount)}</b> · {c.dealDeliverables}</span>}
          </div>
        </div>
      )}

      <div className="box">
        <h3>Notes</h3>
        {!detail.notes.length && <div className="sub">No notes yet.</div>}
        {detail.notes.map((n) => (
          <div key={n.id} className="sub" style={{ marginTop: 4 }}>
            • {n.text} <span style={{ opacity: 0.7 }}>— {n.by ?? "someone"}, {fmtDateTime(n.at)}</span>
          </div>
        ))}
        <form
          style={{ display: "flex", gap: 6, marginTop: 8 }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!note.trim()) return;
            if (await run(() => post(`/api/colleges/${c.id}/notes`, { text: note }), "Note saved")) {
              setNote("");
              reload();
            }
          }}
        >
          <input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Log a call or message" />
          <button disabled={busy}>Save</button>
        </form>
      </div>

      {detail.log.length > 0 && (
        <div className="box">
          <h3>Stage history</h3>
          {detail.log.map((l) => (
            <div className="sub" key={l.id} style={{ marginTop: 4 }}>
              {fmtDateTime(l.at)} · {STAGE_LABEL[l.from] ?? l.from} → <b>{STAGE_LABEL[l.to] ?? l.to}</b> · {l.by ?? "someone"}
              {l.reason ? ` · ${l.reason}` : ""}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Phone numbers are stored as digits; the form shows them with a leading "+". */
const toForm = (c: CollegeDetail["college"]) => ({ ...c, convenorPhone: c.convenorPhone ? "+" + c.convenorPhone : "", facultyPhone: c.facultyPhone ? "+" + c.facultyPhone : "" });

function DetailsTab({ college, reload }: { college: CollegeDetail["college"]; reload: () => void }) {
  const [f, setF] = useState(() => toForm(college));
  useEffect(() => setF(toForm(college)), [college]);
  const { busy, error, run } = useAction();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const y = new Date().getFullYear();
  const dateRange = fmtRange(f.festStart, f.festEnd);

  return (
    <>
      <div className="box">
        <h3>Fest details</h3>
        <div className="fl" style={{ marginTop: 8 }}>
          <TextField full label="College name" value={f.name} onChange={(v) => set("name", v)} />
          <GeoFields state={f.state} city={f.city} onChange={(s, c) => setF((p) => ({ ...p, state: s, city: c }))} />
          <TextField label="Fest name" value={f.festName} onChange={(v) => set("festName", v)} />
          <TextField label="Pitching as (company)" value={f.pitchCompany} onChange={(v) => set("pitchCompany", v)} ph="Luna Wave" />
          <SelectField label="Fest type" value={f.festType} onChange={(v) => set("festType", v as never)} options={FEST_TYPES.map((t) => [t, t[0].toUpperCase() + t.slice(1)] as [string, string])} />
          <SelectField label="Expected month" value={f.festMonth} onChange={(v) => set("festMonth", +v)} options={MONTHS.map((m, i) => [i, m] as [number, string])} />
          <SelectField label="Fest year" value={f.festYear} onChange={(v) => set("festYear", +v)} options={[-2, -1, 0, 1, 2].map((k) => [y + k, String(y + k)] as [number, string])} />
          <TextField type="date" label="Start date" value={f.festStart ?? ""} onChange={(v) => set("festStart", v || null)} />
          <TextField type="date" label="End date" value={f.festEnd ?? ""} onChange={(v) => set("festEnd", v || null)} />
          <SelectField label="Number of days" value={f.days} onChange={(v) => set("days", +v)} options={[1, 2, 3, 4, 5, 6, 7].map((n) => [n, `${n} day${n > 1 ? "s" : ""}`] as [number, string])} />
        </div>
        {dateRange && <div className="sub" style={{ marginTop: 6 }}>Dates: {dateRange}. A start date sets the month and year.</div>}
      </div>
      <div className="box">
        <h3>Contacts</h3>
        <div className="fl" style={{ marginTop: 8 }}>
          <TextField label="Student convenor (POC)" value={f.convenorName} onChange={(v) => set("convenorName", v)} />
          <TextField label="Convenor phone" value={f.convenorPhone} ph="+91 98765 43210" onChange={(v) => set("convenorPhone", v)} />
          <TextField label="Faculty coordinator" value={f.facultyName} onChange={(v) => set("facultyName", v)} />
          <TextField label="Faculty phone" value={f.facultyPhone} ph="+91 98765 43210" onChange={(v) => set("facultyPhone", v)} />
        </div>
      </div>
      <div className="box">
        <h3>Deal figures</h3>
        <div className="fl" style={{ marginTop: 8 }}>
          <NumField label="Total artist budget (₹)" value={f.artistBudget} onChange={(n) => set("artistBudget", n)} />
          <NumField label="Production budget (₹)" value={f.prodBudget} onChange={(n) => set("prodBudget", n)} />
          <TextField full label="Wishlist" value={f.wishlist} onChange={(v) => set("wishlist", v)} />
          <TextField full label="Scope comments" value={f.scopeNotes} onChange={(v) => set("scopeNotes", v)} />
          <NumField label="Proposed artist rate (₹)" value={f.proposedArtistRate} onChange={(n) => set("proposedArtistRate", n)} />
          <NumField label="Proposed production rate (₹)" value={f.proposedProdRate} onChange={(n) => set("proposedProdRate", n)} />
          <TextField full label="Proposal notes" value={f.proposalNotes} onChange={(v) => set("proposalNotes", v)} />
          <NumField label="Final amount (₹)" value={f.dealAmount} onChange={(n) => set("dealAmount", n)} />
          <Field label="Final deliverables">
            <input value={f.dealDeliverables} onChange={(e) => set("dealDeliverables", e.target.value)} />
          </Field>
        </div>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <button
        className="p"
        style={{ width: "100%" }}
        disabled={busy}
        onClick={async () => {
          const { festStart, festEnd } = f;
          const body = {
            name: f.name, city: f.city, state: f.state, festName: f.festName, pitchCompany: f.pitchCompany, festType: f.festType, festMonth: f.festMonth, festYear: f.festYear, festStart, festEnd, days: f.days,
            convenorName: f.convenorName, convenorPhone: normPhone(f.convenorPhone), facultyName: f.facultyName, facultyPhone: normPhone(f.facultyPhone),
            artistBudget: f.artistBudget, prodBudget: f.prodBudget, wishlist: f.wishlist, scopeNotes: f.scopeNotes,
            proposedArtistRate: f.proposedArtistRate, proposedProdRate: f.proposedProdRate, proposalNotes: f.proposalNotes, dealAmount: f.dealAmount, dealDeliverables: f.dealDeliverables,
          };
          if (await run(() => patch(`/api/colleges/${college.id}`, body), "Details saved")) reload();
        }}
      >
        {busy ? "Saving…" : "Save details"}
      </button>
    </>
  );
}
