"use client";
import { useState } from "react";
import useSWR from "swr";
import { del, fetcher, post } from "@/lib/client";
import { fmtDate, inr } from "@/lib/format";
import { GENRES, MONTHS } from "@/lib/stages";
import type { ArtistEntry, ArtistRow, CollegeDetail, CompanyRow, ProdEntry, SponsorRow, Travel, YearRow } from "@/lib/types";
import { Field, Modal, NumField, Seg, SelectField, Tag, TextField, useAction } from "../ui";

type Section = "year" | "sponsor" | "artist" | "production";
const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 12 }, (_, i) => thisYear + 1 - i);
const TRAVEL_OPTS: [Travel, string][] = [
  ["included", "Included in fee"],
  ["extra", "Not included, paid extra"],
  ["unknown", "Not sure"],
];

const travelTag = (t: Travel, extra: number) =>
  t === "included" ? <Tag tone="g">Incl. travel &amp; stay</Tag> : t === "extra" ? <Tag tone="w">Excl. travel &amp; stay{extra ? ` · +${inr(extra)}` : ""}</Tag> : <Tag>Travel &amp; stay: not sure</Tag>;

const yTot = (rows: { year: number; kind?: string; amount: number }[], y: number) => {
  const l = rows.filter((r) => r.year === y);
  const sum = (total: boolean) => l.filter((r) => (total ? r.kind === "total" : r.kind !== "total")).reduce((s, r) => s + r.amount, 0);
  return sum(false) || sum(true);
};

export function HistoryTabs({ detail, canEdit, reload }: { detail: CollegeDetail; canEdit: boolean; reload: () => void }) {
  const [tab, setTab] = useState<"ov" | "artist" | "production" | "sponsor">("ov");
  const [edit, setEdit] = useState<null | { section: Section; row?: Record<string, unknown>; kind?: "item" | "total"; year?: number }>(null);
  const [rm, setRm] = useState<null | { section: Section; id: number }>(null);
  const c = detail.college;
  const open = (section: Section, row?: Record<string, unknown>, kind?: "item" | "total", year?: number) => setEdit({ section, row, kind, year });

  const years = [...new Set([...detail.years.map((y) => y.year), ...detail.artistEntries.map((x) => x.year), ...detail.productionEntries.map((x) => x.year), ...detail.sponsors.map((x) => x.year)])].sort((a, b) => b - a);

  return (
    <>
      <Seg value={tab} onChange={setTab} items={[["ov", "Overview"], ["artist", "Artists"], ["production", "Production"], ["sponsor", "Sponsors"]]} />
      {tab === "ov" && (
        <>
          <div className="top" style={{ marginBottom: 8 }}>
            <div className="sub">One card per fest year, with totals from the other tabs</div>
            {canEdit && <button className="p" onClick={() => open("year")}>+ Add year</button>}
          </div>
          {!years.length && <div className="box">No past years yet. Add a year, then fill the Artists, Production and Sponsors tabs.</div>}
          {years.map((yr) => {
            const y = detail.years.find((r) => r.year === yr);
            return (
              <div className="box" key={yr}>
                <div className="top" style={{ marginBottom: 6 }}>
                  <h3>
                    {yr} <Tag>{y?.agency || "Company not set"}</Tag>
                  </h3>
                  {canEdit && (
                    <div style={{ display: "flex", gap: 6 }}>
                      {y ? (
                        <>
                          <button className="sm" onClick={() => open("year", y as unknown as Record<string, unknown>)}>Edit</button>
                          <button className="sm" onClick={() => setRm({ section: "year", id: y.id })}>Delete</button>
                        </>
                      ) : (
                        <button className="sm" onClick={() => open("year", undefined, undefined, yr)}>Add details</button>
                      )}
                    </div>
                  )}
                </div>
                <div className="sub">
                  {y ? `${y.eventMonth != null ? MONTHS[y.eventMonth] : "Month not set"}${y.startDate ? " · " + fmtDate(y.startDate) + (y.endDate ? " – " + fmtDate(y.endDate) : "") : ""} · ${y.days}-day` : "Dates and company not added"}
                </div>
                <div className="sub" style={{ marginTop: 8 }}>
                  Artists <b>{inr(yTot(detail.artistEntries, yr))}</b> · Production <b>{inr(yTot(detail.productionEntries, yr))}</b> · Sponsorship <b>{inr(yTot(detail.sponsors, yr))}</b>
                </div>
              </div>
            );
          })}
        </>
      )}
      {tab === "artist" && <Section title="Artists per day, with fee" rows={detail.artistEntries} totalLabel="Total artist budget" canEdit={canEdit} onAdd={(k) => open("artist", undefined, k)} render={(x) => {
        const a = x as ArtistEntry;
        return { main: a.kind === "total" ? <b>Total artist budget</b> : <><b>{a.artistName}</b> <Tag>{a.genre || "Genre not set"}</Tag></>, sub: a.kind === "total" ? "Overall figure for the year" : a.day ? `Day ${a.day}` : "Day not set", extra: [a.notes], right: <>{inr(a.amount)}<div>{travelTag(a.travel, a.travelExtra)}</div></> };
      }} onEdit={(r) => open("artist", r)} onDelete={(id) => setRm({ section: "artist", id })} empty="No lineup recorded yet. Add artists day by day, or just a year total." />}
      {tab === "production" && <Section title="Vendors and scope, with cost" rows={detail.productionEntries} totalLabel="Total production budget" canEdit={canEdit} onAdd={(k) => open("production", undefined, k)} render={(x) => {
        const p = x as ProdEntry;
        return { main: p.kind === "total" ? <b>Total production budget</b> : <><b>{p.vendor || "Vendor not set"}</b> <Tag>{p.scope || "Scope not set"}</Tag></>, sub: p.kind === "total" ? "Overall figure for the year" : p.day ? `Day ${p.day}` : "Whole fest", extra: [p.notes], right: <>{inr(p.amount)}<div>{travelTag(p.travel, p.travelExtra)}</div></> };
      }} onEdit={(r) => open("production", r)} onDelete={(id) => setRm({ section: "production", id })} empty="No production recorded yet. Add vendor lines, or just a year total." />}
      {tab === "sponsor" && <Section title="Brands that sponsored past fests" rows={detail.sponsors.map((s) => ({ ...s, kind: "item" }))} noTotal canEdit={canEdit} onAdd={() => open("sponsor")} render={(x) => {
        const s = x as unknown as SponsorRow;
        const when = s.eventDate ? fmtDate(s.eventDate) : s.eventMonth != null ? MONTHS[s.eventMonth] : "";
        return { main: <><b>{s.brand}</b> <Tag>{s.title || "Sponsor"}</Tag>{s.exclusive && <> <Tag tone="w">Exclusive</Tag></>}</>, sub: [when, s.deliverables].filter(Boolean).join(" · "), extra: [s.notes], right: <>{inr(s.amount)}</> };
      }} onEdit={(r) => open("sponsor", r)} onDelete={(id) => setRm({ section: "sponsor", id })} empty="No sponsors recorded yet. Add each brand with its title and amount." />}

      {edit && <EntryModal collegeId={c.id} days={c.days} edit={edit} detail={detail} onClose={() => setEdit(null)} onDone={() => { setEdit(null); reload(); }} />}
      {rm && <ConfirmDelete collegeId={c.id} rm={rm} onClose={() => setRm(null)} onDone={() => { setRm(null); reload(); }} />}
    </>
  );
}

type Row = { id: number; year: number; kind?: string; amount: number } & Record<string, unknown>;
function Section({ title, rows, canEdit, onAdd, onEdit, onDelete, render, empty, noTotal, totalLabel }: {
  title: string; rows: unknown[]; canEdit: boolean; noTotal?: boolean; totalLabel?: string; empty: string;
  onAdd: (k?: "item" | "total") => void; onEdit: (r: Record<string, unknown>) => void; onDelete: (id: number) => void;
  render: (r: Row) => { main: React.ReactNode; sub: string; extra: string[]; right: React.ReactNode };
}) {
  const list = rows as Row[];
  const years = [...new Set(list.map((r) => r.year))].sort((a, b) => b - a);
  const order = (a: Row, b: Row) => (b.kind === "total" ? 1 : 0) - (a.kind === "total" ? 1 : 0) || ((a.day as number) || 0) - ((b.day as number) || 0);
  return (
    <>
      <div className="top" style={{ margin: "10px 0 8px" }}>
        <div className="sub">{title}</div>
        {canEdit && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {!noTotal && <button onClick={() => onAdd("total")}>+ Year total</button>}
            <button className="p" onClick={() => onAdd("item")}>+ Add</button>
          </div>
        )}
      </div>
      {!years.length && <div className="box">{empty}</div>}
      {years.map((y) => (
        <div className="box" key={y}>
          <div className="top" style={{ marginBottom: 4 }}>
            <h3>{y}</h3>
            <b>{inr(yTot(list, y))}</b>
          </div>
          {list.filter((r) => r.year === y).sort(order).map((r, i) => {
            const v = render(r);
            return (
              <div className={`rw${i === 0 ? " first" : ""}`} key={r.id}>
                <div>
                  {v.main}
                  <div className="sub">{[v.sub, ...v.extra].filter(Boolean).join(" · ")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <b>{v.right}</b>
                  {canEdit && (
                    <div style={{ marginTop: 6 }}>
                      <button className="sm" onClick={() => onEdit(r)}>Edit</button> <button className="sm" aria-label="Delete" onClick={() => onDelete(r.id)}>✕</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <span hidden>{totalLabel}</span>
    </>
  );
}

function ConfirmDelete({ collegeId, rm, onClose, onDone }: { collegeId: number; rm: { section: Section; id: number }; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  return (
    <Modal onClose={onClose} title="Delete this entry?">
      <p className="sub">This can't be undone.</p>
      <button className="p" disabled={busy} onClick={async () => (await run(() => del(`/api/colleges/${collegeId}/history?section=${rm.section}&id=${rm.id}`), "Deleted")) && onDone()}>
        Delete
      </button>{" "}
      <button onClick={onClose}>Cancel</button>
    </Modal>
  );
}

type F = Record<string, string | number | boolean | null | undefined>;
function EntryModal({ collegeId, days, edit, detail, onClose, onDone }: { collegeId: number; days: number; edit: { section: Section; row?: Record<string, unknown>; kind?: "item" | "total"; year?: number }; detail: CollegeDetail; onClose: () => void; onDone: () => void }) {
  const { section, row } = edit;
  const lastYear = Math.max(0, ...[...detail.years, ...detail.sponsors, ...detail.artistEntries, ...detail.productionEntries].map((r) => r.year)) || thisYear - 1;
  const [f, setF] = useState<F>(() => ({
    year: edit.year ?? lastYear,
    kind: edit.kind ?? "item",
    day: 0,
    amount: 0,
    travel: "unknown",
    travelExtra: 0,
    notes: "",
    days,
    ...(row as F),
  }));
  const set = (k: string, v: string | number | boolean | null) => setF((p) => ({ ...p, [k]: v }));
  const str = (k: string) => String(f[k] ?? "");
  const num = (k: string) => Number(f[k] ?? 0);
  const { busy, error, run } = useAction();
  const { data: roster } = useSWR<ArtistRow[]>(section === "artist" ? "/api/artists" : null, fetcher);
  const { data: companies } = useSWR<CompanyRow[]>(section === "sponsor" ? "/api/companies" : null, fetcher);
  const isTotal = f.kind === "total";
  const dayOpts: [number, string][] = [[0, section === "production" ? "Whole fest" : "Not set"], ...Array.from({ length: days }, (_, i) => [i + 1, `Day ${i + 1}`] as [number, string])];
  const yearOpts: [number, string][] = YEARS.map((y) => [y, String(y)]);
  const [otherArtist, setOtherArtist] = useState(() => !!row && !row.artistId && !!row.artistName);

  const travelFields = (
    <>
      <SelectField label="Travel and stay" value={str("travel") as Travel} onChange={(v) => set("travel", v)} options={TRAVEL_OPTS} />
      {f.travel === "extra" && <NumField label="Extra travel and stay amount (₹)" value={num("travelExtra")} onChange={(n) => set("travelExtra", n)} />}
    </>
  );

  function body(): unknown {
    if (section === "year") return { year: +f.year!, agency: str("agency"), eventMonth: f.eventMonth === null || f.eventMonth === "" || f.eventMonth === undefined ? null : +f.eventMonth, startDate: str("startDate") || null, endDate: str("endDate") || null, days: +f.days! };
    if (section === "sponsor")
      return { brand: str("brand"), year: +f.year!, title: str("title"), amount: num("amount"), deliverables: str("deliverables"), exclusive: !!f.exclusive, eventMonth: f.eventMonth === null || f.eventMonth === "" || f.eventMonth === undefined ? null : +f.eventMonth, eventDate: str("eventDate") || null, notes: str("notes") };
    if (section === "artist")
      return { year: +f.year!, kind: str("kind"), artistId: otherArtist ? null : (f.artistId as number | null) || null, artistName: str("artistName"), genre: str("genre"), day: +f.day!, amount: num("amount"), travel: str("travel"), travelExtra: f.travel === "extra" ? num("travelExtra") : 0, notes: str("notes") };
    return { year: +f.year!, kind: str("kind"), vendor: str("vendor"), scope: str("scope"), day: +f.day!, amount: num("amount"), travel: str("travel"), travelExtra: f.travel === "extra" ? num("travelExtra") : 0, notes: str("notes") };
  }
  const names = { year: "fest year", sponsor: "sponsor", artist: isTotal ? "artist budget total" : "artist", production: isTotal ? "production total" : "production line" }[section];

  return (
    <Modal onClose={onClose} title={`${row ? "Edit" : "Add"} ${names}`} wide>
      <div className="fl">
        <SelectField label="Year" value={+f.year!} onChange={(v) => set("year", +v)} options={yearOpts} />
        {section === "year" && (
          <>
            <TextField label="Company or agency" value={str("agency")} onChange={(v) => set("agency", v)} list="agencies" />
            <datalist id="agencies">{["Self-managed", ...detail.years.map((y: YearRow) => y.agency)].filter(Boolean).map((a) => <option key={a}>{a}</option>)}</datalist>
            <SelectField label="Month" value={f.eventMonth === null || f.eventMonth === undefined ? "" : String(f.eventMonth)} onChange={(v) => set("eventMonth", v === "" ? null : +v)} options={[["", "Not sure"], ...MONTHS.map((m, i) => [String(i), m] as [string, string])]} />
            <TextField type="date" label="Start date" value={str("startDate")} onChange={(v) => set("startDate", v)} />
            <TextField type="date" label="End date" value={str("endDate")} onChange={(v) => set("endDate", v)} />
            <SelectField label="Number of days" value={+f.days!} onChange={(v) => set("days", +v)} options={[1, 2, 3, 4, 5, 6, 7].map((n) => [n, String(n)] as [number, string])} />
          </>
        )}
        {section === "sponsor" && (
          <>
            <TextField full label="Sponsor or brand" value={str("brand")} onChange={(v) => set("brand", v)} list="brands" />
            <datalist id="brands">{(companies ?? []).map((c) => <option key={c.id}>{c.name}</option>)}</datalist>
            <TextField label="Sponsorship title" value={str("title")} onChange={(v) => set("title", v)} list="titles" ph="Title sponsor" />
            <datalist id="titles">{["Title sponsor", "Powered by", "Associate sponsor", "Co-sponsor", "Category partner", "Gifting partner"].map((t) => <option key={t}>{t}</option>)}</datalist>
            <NumField label="Amount (₹)" value={num("amount")} onChange={(n) => set("amount", n)} />
            <TextField type="date" label="Exact date (optional)" value={str("eventDate")} onChange={(v) => set("eventDate", v)} />
            <SelectField label="Or just the month" value={f.eventMonth === null || f.eventMonth === undefined ? "" : String(f.eventMonth)} onChange={(v) => set("eventMonth", v === "" ? null : +v)} options={[["", "Not set"], ...MONTHS.map((m, i) => [String(i), m] as [string, string])]} />
            <TextField full label="Deliverables" value={str("deliverables")} onChange={(v) => set("deliverables", v)} ph="Stall, banner, stage branding" />
            <Field label="Exclusive?">
              <select value={f.exclusive ? "yes" : "no"} onChange={(e) => set("exclusive", e.target.value === "yes")}>
                <option value="no">No</option>
                <option value="yes">Yes, exclusive in category</option>
              </select>
            </Field>
            <TextField label="Notes" value={str("notes")} onChange={(v) => set("notes", v)} />
          </>
        )}
        {section === "artist" && (
          <>
            {!isTotal && (
              <>
                <SelectField label="Day" value={+f.day!} onChange={(v) => set("day", +v)} options={dayOpts} />
                <Field full label="Artist (from our roster)">
                  <select
                    value={otherArtist ? "__o" : String(f.artistId ?? "")}
                    onChange={(e) => {
                      if (e.target.value === "__o") {
                        setOtherArtist(true);
                        set("artistId", null);
                      } else {
                        setOtherArtist(false);
                        const a = roster?.find((x) => x.id === +e.target.value);
                        setF((p) => ({ ...p, artistId: a ? a.id : null, artistName: a?.name ?? "", genre: a?.genre ?? p.genre }));
                      }
                    }}
                  >
                    <option value="">Select artist</option>
                    {(roster ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    <option value="__o">Other (not in roster)</option>
                  </select>
                </Field>
                {otherArtist && <TextField full label="Artist name" value={str("artistName")} onChange={(v) => set("artistName", v)} />}
                <SelectField label="Genre" value={str("genre")} onChange={(v) => set("genre", v)} options={[["", "Select genre"], ...[...new Set([...GENRES, str("genre")].filter(Boolean))].map((g) => [g, g] as [string, string])]} />
              </>
            )}
            <NumField label={isTotal ? "Total amount (₹)" : "Fee (₹)"} value={num("amount")} onChange={(n) => set("amount", n)} />
            {travelFields}
            <TextField full label="Notes" value={str("notes")} onChange={(v) => set("notes", v)} />
          </>
        )}
        {section === "production" && (
          <>
            {!isTotal && (
              <>
                <SelectField label="Day" value={+f.day!} onChange={(v) => set("day", +v)} options={dayOpts} />
                <TextField label="Vendor" value={str("vendor")} onChange={(v) => set("vendor", v)} />
                <TextField label="Scope" value={str("scope")} onChange={(v) => set("scope", v)} list="scopes" ph="Stage, sound, light" />
                <datalist id="scopes">{["Stage", "Sound", "Light", "LED wall", "Truss and rigging", "Backline", "Power and generators"].map((t) => <option key={t}>{t}</option>)}</datalist>
              </>
            )}
            <NumField label={isTotal ? "Total amount (₹)" : "Amount (₹)"} value={num("amount")} onChange={(n) => set("amount", n)} />
            {travelFields}
            <TextField full label="Notes" value={str("notes")} onChange={(v) => set("notes", v)} />
          </>
        )}
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="p" style={{ width: "100%", marginTop: 14 }} disabled={busy} onClick={async () => (await run(() => post(`/api/colleges/${collegeId}/history`, { section, id: row?.id, data: body() }), "Saved")) && onDone()}>
        {busy ? "Saving…" : "Save"}
      </button>
    </Modal>
  );
}
