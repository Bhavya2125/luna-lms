"use client";
import { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { del, fetcher, patch, post } from "@/lib/client";
import { fmtDate, inr, normPhone } from "@/lib/format";
import { GENRES, MONTHS } from "@/lib/stages";
import type { ArtistDetail, ArtistRow, Me, Travel } from "@/lib/types";
import { Drawer, Field, Modal, NumField, Seg, SelectField, Tag, TextField, useAction } from "../ui";

const lock = <span className="lock">🔒 Locked – contact admin</span>;
const TRAVEL: [Travel, string][] = [["included", "Included in fee"], ["extra", "Not included, paid extra"], ["unknown", "Not sure"]];
const travelTag = (t: Travel, extra: number | null) =>
  t === "included" ? <Tag tone="g">Incl. travel &amp; stay</Tag> : t === "extra" ? <Tag tone="w">Excl. travel &amp; stay{extra ? ` · +${inr(extra)}` : ""}</Tag> : <Tag>Travel &amp; stay: not sure</Tag>;

export function RosterView({ me }: { me: Me }) {
  const admin = me.role !== "executive";
  const { mutate } = useSWRConfig();
  const { data, error } = useSWR<ArtistRow[]>("/api/artists", fetcher);
  const [view, setView] = useState<"list" | "grid">("list");
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("");
  const [open, setOpen] = useState<{ id: number | "new"; tab: "ov" | "shows" | "edit" } | null>(null);
  // colleges, sponsors and the roster share data (history creates companies and shows), so refresh every list after a save
  const refresh = () => mutate((k) => typeof k === "string" && k.startsWith("/api/"));

  const genres = useMemo(() => [...new Set([...GENRES, ...(data ?? []).map((a) => a.genre)].filter(Boolean))], [data]);
  const rows = (data ?? []).filter((a) => (!q || (a.name + a.stageName + a.genre).toLowerCase().includes(q.toLowerCase())) && (!genre || a.genre === genre));
  const nf = (q ? 1 : 0) + (genre ? 1 : 0);
  const rider = (a: ArtistRow) => (a.techRiderUrl || a.hospitalityRiderUrl ? <Tag tone="g">Rider link</Tag> : a.riderNotes ? <Tag tone="w">Rider notes</Tag> : <Tag>No rider</Tag>);

  return (
    <>
      <div className="top">
        <h2>Artist roster <span className="sub">{rows.length}</span></h2>
        {admin && <button className="p" onClick={() => setOpen({ id: "new", tab: "edit" })}>+ Add artist</button>}
      </div>
      <div className="seg">
        <span style={{ flex: 1 }} />
        <Seg value={view} onChange={setView} items={[["list", "List"], ["grid", "Cards"]]} />
      </div>
      <div className="bar b3">
        <input aria-label="Search" placeholder="Search artist, stage name, genre" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="">Genre</option>
          {genres.map((g) => <option key={g}>{g}</option>)}
        </select>
        <span />
      </div>
      {nf > 0 && <div style={{ margin: "-4px 0 12px" }}><button onClick={() => { setQ(""); setGenre(""); }}>✕ Clear all filters ({nf})</button></div>}
      {error && <div className="box err">{String(error.message)}</div>}
      {!data && !error && <div className="box sub">Loading roster…</div>}
      {data && !rows.length && <div className="box">No artists match. Clear a filter or add an artist.</div>}

      {view === "list" && rows.length > 0 && (
        <>
          <div className="row h b6"><span>Artist</span><span>Genre</span><span>Shows and crew</span><span>Contact and rate</span><span>Tech rider</span><span /></div>
          {rows.map((a) => {
            const c0 = a.contacts?.[0];
            return (
              <div className="row b6" key={a.id}>
                <div>
                  <button className="lnk" onClick={() => setOpen({ id: a.id, tab: "ov" })}>{a.name}</button>
                  <div className="sub">{a.stageName && a.stageName !== a.name ? a.stageName : ""}</div>
                </div>
                <span><Tag>{a.genre || "—"}</Tag></span>
                <span>{a.shows} show{a.shows === 1 ? "" : "s"}<div className="sub">{a.crewCount ? `${a.crewCount} in crew` : "Crew not set"}</div></span>
                <span>
                  {admin ? (c0 ? <>{c0.name || "Contact"}{c0.designation ? ` · ${c0.designation}` : ""}{a.contacts!.length > 1 && <> <Tag>+{a.contacts!.length - 1}</Tag></>}<div className="sub">{c0.phone ? `+${c0.phone}` : ""}{a.lastRate ? ` · Rate ${inr(a.lastRate)}` : ""}</div></> : <span className="sub">No contacts</span>) : lock}
                </span>
                <span>{rider(a)}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setOpen({ id: a.id, tab: "ov" })}>Open</button>
                  {admin && <button onClick={() => setOpen({ id: a.id, tab: "edit" })}>Edit</button>}
                </span>
              </div>
            );
          })}
        </>
      )}
      {view === "grid" && rows.length > 0 && (
        <div className="g2">
          {rows.map((a) => (
            <div className="box" key={a.id}>
              <h3>{a.name}</h3>
              <div className="sub">Stage name: {a.stageName || "—"}</div>
              <p><Tag>{a.genre || "—"}</Tag> {rider(a)}</p>
              <p className="sub">{a.shows} show{a.shows === 1 ? "" : "s"} · {a.crewCount ? `${a.crewCount} in crew` : "Crew not set"}</p>
              <div>Contact: {admin ? (a.contacts?.[0]?.phone ? `+${a.contacts[0].phone}` : "—") : lock}</div>
              <div>Last closed rate: {admin ? <b>{inr(a.lastRate)}</b> : lock}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                <button onClick={() => setOpen({ id: a.id, tab: "ov" })}>Open</button>
                {admin && <button onClick={() => setOpen({ id: a.id, tab: "edit" })}>Edit</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {open && <ArtistDrawer key={`${open.id}-${open.tab}`} me={me} id={open.id} tab={open.tab} onClose={() => setOpen(null)} onChanged={refresh} onOpen={(id, tab) => setOpen({ id, tab })} />}
    </>
  );
}

function ArtistDrawer({ me, id, tab, onClose, onChanged, onOpen }: { me: Me; id: number | "new"; tab: "ov" | "shows" | "edit"; onClose: () => void; onChanged: () => void; onOpen: (id: number, tab: "ov" | "shows" | "edit") => void }) {
  const admin = me.role !== "executive";
  const key = id === "new" ? null : `/api/artists/${id}`;
  const { data, mutate } = useSWR<ArtistDetail>(key, fetcher);
  const [t, setT] = useState(tab);
  const reload = () => {
    mutate();
    onChanged();
  };
  if (id !== "new" && !data) return <Drawer onClose={onClose} title="Loading…"><div className="sub">Loading artist…</div></Drawer>;
  const a = data?.artist;
  const tabs: [typeof t, string][] = id === "new" ? [["edit", "Details"]] : [["ov", "Overview"], ["shows", `Shows (${(data?.history.length ?? 0) + (data?.manual.length ?? 0)})`], ...(admin ? ([["edit", "Edit"]] as [typeof t, string][]) : [])];

  return (
    <Drawer onClose={onClose} title={a?.name ?? "New artist"} sub={a ? `${a.genre || "Genre not set"}${a.stageName && a.stageName !== a.name ? " · " + a.stageName : ""}` : undefined}>
      <Seg value={t} onChange={setT} items={tabs} />
      {t === "ov" && a && (
        <>
          <div className="box">
            <div className="sub">Stage name: {a.stageName || "—"}</div>
            <p><Tag>{a.genre || "Genre not set"}</Tag> <Tag>{a.crewCount ? `${a.crewCount} in crew` : "Crew not set"}</Tag></p>
            <div>Last closed rate: {admin ? <b>{inr(a.lastRate)}</b> : lock}</div>
          </div>
          <div className="box">
            <h3>Contacts</h3>
            {admin ? (
              data!.contacts?.length ? data!.contacts.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                  <span><b>{c.name || "Contact"}</b>{c.designation && <> <Tag>{c.designation}</Tag></>}{c.phone && <span className="sub"> +{c.phone}</span>}</span>
                  {c.phone && <span><a href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener noreferrer"><button className="sm">WhatsApp</button></a> <a href={`tel:+${c.phone}`}><button className="sm">Call</button></a></span>}
                </div>
              )) : <div className="sub">No contacts yet.</div>
            ) : lock}
          </div>
          <div className="box">
            <h3>Riders</h3>
            {a.riderNotes && <p style={{ whiteSpace: "pre-wrap", margin: "6px 0" }}>{a.riderNotes}</p>}
            {([["Tech rider", a.techRiderUrl], ["Hospitality rider", a.hospitalityRiderUrl]] as const).map(([l, u]) =>
              u ? (
                <div className="rw" style={{ border: 0, padding: "6px 0 0" }} key={l}>
                  <div><b>{l}</b><div className="sub" style={{ wordBreak: "break-all" }}>{u}</div></div>
                  <a href={u} target="_blank" rel="noopener noreferrer"><button>Open link</button></a>
                </div>
              ) : <div key={l} className="sub" style={{ marginTop: 6 }}>{l}: no link added.</div>,
            )}
          </div>
        </>
      )}
      {t === "shows" && a && <ShowsTab detail={data!} admin={admin} reload={reload} />}
      {t === "edit" && admin && (
        <EditTab
          detail={data}
          onSaved={(newId) => {
            onChanged();
            if (id === "new") onOpen(newId, "ov");
            else {
              mutate();
              setT("ov");
            }
          }}
          onCancel={() => (id === "new" ? onClose() : setT("ov"))}
        />
      )}
      {t === "edit" && !admin && <div className="box">Only admins can edit artists.</div>}
    </Drawer>
  );
}

function ShowsTab({ detail, admin, reload }: { detail: ArtistDetail; admin: boolean; reload: () => void }) {
  const [edit, setEdit] = useState<{ row?: ArtistDetail["manual"][number] } | null>(null);
  const [rm, setRm] = useState<number | null>(null);
  const a = detail.artist;
  const fee = (n: number | null) => (admin ? inr(n) : "🔒");
  const rows = [
    ...detail.history.map((h) => ({ k: `h${h.id}`, year: h.year, src: "h" as const, h })),
    ...detail.manual.map((m) => ({ k: `m${m.id}`, year: m.year, src: "m" as const, m })),
  ].sort((x, y) => y.year - x.year);
  return (
    <>
      <div className="top" style={{ margin: "10px 0 8px" }}>
        <div className="sub">From college history, plus shows added by hand</div>
        {admin && <button className="p" onClick={() => setEdit({})}>+ Add show</button>}
      </div>
      {!rows.length && <div className="box">No shows yet. Shows appear here from college history, or add one by hand.</div>}
      {rows.map((r) =>
        r.src === "h" ? (
          <div className="box" key={r.k}>
            <div className="rw first">
              <div><b>{r.h.college}</b> <Tag>{r.year}</Tag> <Tag tone="g">College history</Tag><div className="sub">{r.h.day ? `Day ${r.h.day}` : "Day not set"}{r.h.notes ? ` · ${r.h.notes}` : ""}</div></div>
              <div style={{ textAlign: "right" }}><b>{fee(r.h.amount)}</b>{admin && <div>{travelTag(r.h.travel, r.h.travelExtra)}</div>}</div>
            </div>
          </div>
        ) : (
          <div className="box" key={r.k}>
            <div className="rw first">
              <div><b>{r.m.collegeName}</b> <Tag>{r.year}</Tag> <Tag tone="w">Added by hand</Tag><div className="sub">{[r.m.eventDate ? fmtDate(r.m.eventDate) : r.m.eventMonth != null ? MONTHS[r.m.eventMonth] : "", r.m.notes].filter(Boolean).join(" · ") || "—"}</div></div>
              <div style={{ textAlign: "right" }}>
                <b>{fee(r.m.amount)}</b>
                {admin && <div>{travelTag(r.m.travel, r.m.travelExtra)}</div>}
                {admin && <div style={{ marginTop: 6 }}><button className="sm" onClick={() => setEdit({ row: r.m })}>Edit</button> <button className="sm" aria-label="Delete" onClick={() => setRm(r.m.id)}>✕</button></div>}
              </div>
            </div>
          </div>
        ),
      )}
      {edit && <ShowModal artistId={a.id} row={edit.row} onClose={() => setEdit(null)} onDone={() => { setEdit(null); reload(); }} />}
      {rm !== null && (
        <Modal onClose={() => setRm(null)} title="Delete this show?">
          <p className="sub">This can't be undone.</p>
          <button className="p" onClick={async () => { await del(`/api/artists/${a.id}/shows?showId=${rm}`); setRm(null); reload(); }}>Delete</button>{" "}
          <button onClick={() => setRm(null)}>Cancel</button>
        </Modal>
      )}
    </>
  );
}

function ShowModal({ artistId, row, onClose, onDone }: { artistId: number; row?: ArtistDetail["manual"][number]; onClose: () => void; onDone: () => void }) {
  const { data: colleges } = useSWR<{ name: string }[]>("/api/colleges?tab=all", fetcher);
  const y = new Date().getFullYear();
  const [f, setF] = useState({ collegeName: row?.collegeName ?? "", year: row?.year ?? y - 1, eventMonth: row?.eventMonth ?? null, eventDate: row?.eventDate ?? "", amount: row?.amount ?? 0, travel: (row?.travel ?? "unknown") as Travel, travelExtra: row?.travelExtra ?? 0, notes: row?.notes ?? "" });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const { busy, error, run } = useAction();
  return (
    <Modal onClose={onClose} title={`${row ? "Edit" : "Add"} show`} wide>
      <div className="fl">
        <TextField full label="College or event" value={f.collegeName} onChange={(v) => set("collegeName", v)} list="cln" />
        <datalist id="cln">{(colleges ?? []).map((c) => <option key={c.name}>{c.name}</option>)}</datalist>
        <SelectField label="Year" value={f.year} onChange={(v) => set("year", +v)} options={Array.from({ length: 12 }, (_, i) => [y + 1 - i, String(y + 1 - i)] as [number, string])} />
        <TextField type="date" label="Exact date (optional)" value={f.eventDate} onChange={(v) => set("eventDate", v)} />
        <SelectField label="Or just the month" value={f.eventMonth === null ? "" : String(f.eventMonth)} onChange={(v) => set("eventMonth", v === "" ? null : +v)} options={[["", "Not set"], ...MONTHS.map((m, i) => [String(i), m] as [string, string])]} />
        <NumField label="Fee (₹)" value={f.amount} onChange={(n) => set("amount", n)} />
        <SelectField label="Travel and stay" value={f.travel} onChange={(v) => set("travel", v as Travel)} options={TRAVEL} />
        {f.travel === "extra" && <NumField label="Extra travel and stay amount (₹)" value={f.travelExtra} onChange={(n) => set("travelExtra", n)} />}
        <TextField full label="Notes" value={f.notes} onChange={(v) => set("notes", v)} />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="p" style={{ width: "100%", marginTop: 14 }} disabled={busy} onClick={async () => (await run(() => post(`/api/artists/${artistId}/shows`, { id: row?.id, ...f, eventDate: f.eventDate || null, travelExtra: f.travel === "extra" ? f.travelExtra : 0 }), "Show saved")) && onDone()}>
        {busy ? "Saving…" : "Save show"}
      </button>
    </Modal>
  );
}

function EditTab({ detail, onSaved, onCancel }: { detail?: ArtistDetail; onSaved: (id: number) => void; onCancel: () => void }) {
  const a = detail?.artist;
  const [f, setF] = useState({
    name: a?.name ?? "",
    stageName: a?.stageName ?? "",
    genre: a?.genre ?? "",
    lastRate: a?.lastRate ?? 0,
    crewCount: a?.crewCount ?? 0,
    riderNotes: a?.riderNotes ?? "",
    techRiderUrl: a?.techRiderUrl ?? "",
    hospitalityRiderUrl: a?.hospitalityRiderUrl ?? "",
    contacts: (detail?.contacts?.length ? detail.contacts : [{ name: "", designation: "", phone: "" }]).map((c) => ({ name: c.name, designation: c.designation, phone: c.phone ? "+" + c.phone : "" })),
  });
  const { busy, error, run } = useAction();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const upd = (i: number, k: "name" | "designation" | "phone", v: string) => set("contacts", f.contacts.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  const genres = [...new Set([...GENRES, f.genre].filter(Boolean))];
  return (
    <>
      <div className="box">
        <h3>Artist details</h3>
        <div className="fl" style={{ marginTop: 8 }}>
          <TextField full label="Artist name" value={f.name} onChange={(v) => set("name", v)} />
          <TextField label="Stage name" value={f.stageName} onChange={(v) => set("stageName", v)} />
          <SelectField label="Genre" value={f.genre} onChange={(v) => set("genre", v)} options={[["", "Select genre"], ...genres.map((g) => [g, g] as [string, string])]} />
          <NumField label="Last closed rate (₹)" value={f.lastRate} onChange={(n) => set("lastRate", n)} />
          <NumField label="Number of crew" value={f.crewCount} onChange={(n) => set("crewCount", n)} />
        </div>
      </div>
      <div className="box">
        <div className="top" style={{ marginBottom: 8 }}>
          <h3>Contacts ({f.contacts.length})</h3>
          <button onClick={() => set("contacts", [...f.contacts, { name: "", designation: "", phone: "" }])}>+ Add contact</button>
        </div>
        {f.contacts.map((c, i) => (
          <div className="fl" key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--ln)" }}>
            <label className="f">Name<input value={c.name} onChange={(e) => upd(i, "name", e.target.value)} /></label>
            <label className="f">Designation<input value={c.designation} placeholder="Manager, Tour manager, Sound engineer" onChange={(e) => upd(i, "designation", e.target.value)} /></label>
            <div className="full">
              <label className="f">Number</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input aria-label="Number" value={c.phone} placeholder="+91 98765 43210" onChange={(e) => upd(i, "phone", e.target.value)} />
                <button aria-label="Remove contact" onClick={() => set("contacts", f.contacts.filter((_, j) => j !== i))}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="box">
        <h3>Riders</h3>
        <Field label="Rider notes">
          <textarea rows={5} value={f.riderNotes} onChange={(e) => set("riderNotes", e.target.value)} placeholder="Backline, monitors, hospitality, sound check time" />
        </Field>
        <div className="fl" style={{ marginTop: 10 }}>
          <TextField full type="url" label="Tech rider link" value={f.techRiderUrl} onChange={(v) => set("techRiderUrl", v)} ph="https://drive.google.com/..." />
          <TextField full type="url" label="Hospitality rider link" value={f.hospitalityRiderUrl} onChange={(v) => set("hospitalityRiderUrl", v)} ph="https://drive.google.com/..." />
        </div>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="p"
          style={{ flex: 1 }}
          disabled={busy}
          onClick={async () => {
            let newId = a?.id ?? 0;
            const norm = (u: string) => (u.trim() && !/^https?:\/\//i.test(u.trim()) ? "https://" + u.trim() : u.trim());
            const body = { ...f, techRiderUrl: norm(f.techRiderUrl), hospitalityRiderUrl: norm(f.hospitalityRiderUrl), contacts: f.contacts.map((c) => ({ ...c, phone: normPhone(c.phone) })) };
            const ok = await run(async () => {
              if (a) await patch(`/api/artists/${a.id}`, body);
              else newId = (await post<{ id: number }>("/api/artists", body)).id;
            }, "Artist saved");
            if (ok) onSaved(newId);
          }}
        >
          {busy ? "Saving…" : "Save artist"}
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}
