"use client";
import { useState } from "react";
import useSWR from "swr";
import { del, fetcher, patch, post } from "@/lib/client";
import { fmtDate, fmtDateTime, inr, normPhone } from "@/lib/format";
import { DEAL_STAGES, DEAL_STAGE_DESC, MONTHS, STAGE_LABEL, type DealStage } from "@/lib/stages";
import type { CompanyDetail, DealDetail, Me } from "@/lib/types";
import { Drawer, Modal, Seg, Tag, useAction, useToast } from "../ui";
import { DEAL_NEEDS_FORM, DealMoveDialog, DealModal } from "./DealParts";

type Tab = "col" | "deals" | "contact";

export function CompanyDrawer({ id, me, onClose, onChanged }: { id: number; me: Me; onClose: () => void; onChanged: () => void }) {
  const { data, error, mutate } = useSWR<CompanyDetail>(`/api/companies/${id}`, fetcher);
  const [tab, setTab] = useState<Tab>("col");
  const [dealModal, setDealModal] = useState<{ deal?: DealDetail } | null>(null);
  const [move, setMove] = useState<{ deal: DealDetail; to: DealStage } | null>(null);
  const [rm, setRm] = useState<DealDetail | null>(null);
  const toast = useToast();
  const admin = me.role !== "executive";
  const reload = () => {
    mutate();
    onChanged();
  };

  if (error) return <Drawer onClose={onClose} title="Company"><div className="box err">{String(error.message)}</div></Drawer>;
  if (!data) return <Drawer onClose={onClose} title="Loading…"><div className="sub">Loading company…</div></Drawer>;
  const { company, contacts, sponsorships, deals } = data;
  const colleges = new Map<number, typeof sponsorships>();
  sponsorships.forEach((s) => colleges.set(s.collegeId, [...(colleges.get(s.collegeId) ?? []), s]));
  const total = sponsorships.reduce((s, r) => s + r.amount, 0);
  const excl = sponsorships.some((s) => s.exclusive) || deals.some((d) => d.exclusive);

  async function request(d: DealDetail, to: DealStage) {
    if (d.stage === to) return;
    const fi = DEAL_STAGES.indexOf(d.stage as DealStage);
    const forward = DEAL_STAGES.indexOf(to) > fi && d.stage !== "locked" && d.stage !== "lost";
    if (to === "lost" || (forward && DEAL_NEEDS_FORM.includes(to))) return setMove({ deal: d, to });
    try {
      await post(`/api/deals/${d.id}/stage`, { to });
      toast(`Moved to ${STAGE_LABEL[to]}`);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't move", true);
    }
  }
  const phoneBtns = (p: string) =>
    p ? (
      <>
        <a href={`https://wa.me/${p}`} target="_blank" rel="noopener noreferrer"><button className="sm">WhatsApp</button></a>{" "}
        <a href={`tel:+${p}`}><button className="sm">Call</button></a>
      </>
    ) : null;

  return (
    <Drawer onClose={onClose} title={company.name} sub={`${company.category || "Category not set"} · ${colleges.size} college${colleges.size === 1 ? "" : "s"} · ${inr(total)} sponsored`}>
      {excl && <Tag tone="w">Exclusive sponsor</Tag>}
      <div className="box" style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {contacts.length ? (
          contacts.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span>
                <b>{c.name || "Contact"}</b> {c.designation && <span className="sub">· {c.designation}</span>} {c.phone && <span className="sub">+{c.phone}</span>}
              </span>
              <span>{phoneBtns(c.phone)}</span>
            </div>
          ))
        ) : (
          <span className="sub">No contacts yet. Add them in the Contact tab.</span>
        )}
      </div>
      <div style={{ marginBottom: 10 }}>
        <button className="p" onClick={() => setDealModal({})}>Reach out</button>
      </div>
      <Seg value={tab} onChange={setTab} items={[["col", `Colleges (${colleges.size})`], ["deals", `Deals (${deals.length})`], ["contact", "Contact"]]} />

      {tab === "col" &&
        (colleges.size ? (
          [...colleges.values()].map((rows) => (
            <div className="box" key={rows[0].collegeId}>
              <div className="top" style={{ marginBottom: 4 }}>
                <div>
                  <b>{rows[0].college}</b>
                  <div className="sub">{rows[0].city}{rows[0].festName ? ` · ${rows[0].festName}` : ""}</div>
                </div>
                <b>{inr(rows.reduce((s, r) => s + r.amount, 0))}</b>
              </div>
              {rows.map((x, i) => (
                <div className={`rw${i === 0 ? " first" : ""}`} key={x.id}>
                  <div>
                    <Tag>{x.year}</Tag> <Tag>{x.title || "Sponsor"}</Tag> {x.exclusive && <Tag tone="w">Exclusive</Tag>}
                    <div className="sub">{[x.eventDate ? fmtDate(x.eventDate) : x.eventMonth != null ? MONTHS[x.eventMonth] : "", x.deliverables || "Deliverables not added", x.notes].filter(Boolean).join(" · ")}</div>
                  </div>
                  <b>{inr(x.amount)}</b>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="box">No college has recorded this company as a sponsor yet. Add it from a college's History, Sponsors tab.</div>
        ))}

      {tab === "deals" && (
        <>
          <div className="top" style={{ margin: "10px 0 8px" }}>
            <div className="sub">One deal per college, each with its own stage</div>
            <button className="p" onClick={() => setDealModal({})}>+ New deal</button>
          </div>
          {!deals.length && <div className="box">No deals yet. Use Reach out when you start a conversation.</div>}
          {deals.map((d) => {
            const i = DEAL_STAGES.indexOf(d.stage as DealStage);
            const closed = d.stage === "locked" || d.stage === "lost";
            return (
              <div className="box" key={d.id}>
                <div className="top" style={{ marginBottom: 6 }}>
                  <div>
                    <b>{d.college ?? "Overall (all fests)"}</b> {d.year && <Tag>{d.year}</Tag>} {d.exclusive && <Tag tone="w">Exclusive</Tag>}
                    <div className="sub">Started {fmtDateTime(d.log[d.log.length - 1]?.at ?? d.updatedAt)} · by {d.by ?? "someone"}</div>
                  </div>
                  <select style={{ width: "auto" }} aria-label="Stage" value={d.stage} onChange={(e) => request(d, e.target.value as DealStage)}>
                    {DEAL_STAGES.map((s, k) => <option key={s} value={s} disabled={!admin && (closed || k < i)}>{STAGE_LABEL[s]}</option>)}
                  </select>
                </div>
                <div className="sub">Amount: <b>{inr(d.amount)}</b> · Deliverables: {d.deliverables || "—"}</div>
                <div className="sub" style={{ margin: "4px 0" }}>Contact: {d.contactName || "—"}{d.contactPhone ? ` · +${d.contactPhone}` : ""} {phoneBtns(d.contactPhone)}</div>
                <div className="sub" style={{ margin: "6px 0" }}><i>{DEAL_STAGE_DESC[d.stage as DealStage]}{d.stage === "lost" && d.lostReason ? ` Reason: ${d.lostReason}.` : ""}</i></div>
                {!closed && i < 3 && <button onClick={() => request(d, DEAL_STAGES[i + 1])}>Move to {STAGE_LABEL[DEAL_STAGES[i + 1]]} →</button>}
                {!closed && i === 3 && <button onClick={() => request(d, "locked")}>Mark locked</button>}
                {closed && !admin && <span className="sub">Only an admin can reopen a closed deal.</span>}
                {d.notes && <p style={{ margin: "8px 0 0" }}>{d.notes}</p>}
                {d.log.length > 0 && (
                  <div className="sub" style={{ marginTop: 8 }}>
                    <b>History</b>
                    {d.log.slice(0, 5).map((l, k) => <div key={k}>{fmtDateTime(l.at)} · {l.from === "new" ? "New" : STAGE_LABEL[l.from]} → {STAGE_LABEL[l.to]} · {l.by ?? "someone"}{l.reason ? ` · ${l.reason}` : ""}</div>)}
                  </div>
                )}
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  <button className="sm" onClick={() => setDealModal({ deal: d })}>Edit</button>
                  <button className="sm" aria-label="Delete" onClick={() => setRm(d)}>✕</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {tab === "contact" && <ContactTab data={data} reload={reload} />}

      {dealModal && <DealModal companyId={company.id} companyName={company.name} deal={dealModal.deal} contacts={contacts} onClose={() => setDealModal(null)} onDone={() => { setDealModal(null); setTab("deals"); reload(); }} />}
      {move && <DealMoveDialog deal={move.deal} name={company.name} to={move.to} onClose={() => setMove(null)} onDone={() => { setMove(null); reload(); }} />}
      {rm && <DeleteDeal deal={rm} onClose={() => setRm(null)} onDone={() => { setRm(null); reload(); }} />}
    </Drawer>
  );
}

function DeleteDeal({ deal, onClose, onDone }: { deal: DealDetail; onClose: () => void; onDone: () => void }) {
  const { busy, run } = useAction();
  return (
    <Modal onClose={onClose} title="Delete this deal?">
      <p className="sub">Its stage history goes with it. This can't be undone.</p>
      <button className="p" disabled={busy} onClick={async () => (await run(() => del(`/api/deals/${deal.id}`), "Deleted")) && onDone()}>Delete</button>{" "}
      <button onClick={onClose}>Cancel</button>
    </Modal>
  );
}

function ContactTab({ data, reload }: { data: CompanyDetail; reload: () => void }) {
  const { company, contacts } = data;
  const [f, setF] = useState({ name: company.name, category: company.category, notes: company.notes, contacts: contacts.length ? contacts.map((c) => ({ name: c.name, designation: c.designation, phone: c.phone ? "+" + c.phone : "" })) : [{ name: "", designation: "", phone: "" }] });
  const { busy, error, run } = useAction();
  const upd = (i: number, k: "name" | "designation" | "phone", v: string) => setF((p) => ({ ...p, contacts: p.contacts.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));
  return (
    <>
      <div className="box">
        <h3>Company details</h3>
        <div className="fl" style={{ marginTop: 8 }}>
          <label className="f full">Company name<input value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} /></label>
          <label className="f">Category<input value={f.category} placeholder="Beverage, Audio" onChange={(e) => setF((p) => ({ ...p, category: e.target.value }))} /></label>
          <label className="f">Notes<input value={f.notes} onChange={(e) => setF((p) => ({ ...p, notes: e.target.value }))} /></label>
        </div>
      </div>
      <div className="box">
        <div className="top" style={{ marginBottom: 8 }}>
          <h3>Contacts ({f.contacts.length})</h3>
          <button onClick={() => setF((p) => ({ ...p, contacts: [...p.contacts, { name: "", designation: "", phone: "" }] }))}>+ Add contact</button>
        </div>
        {f.contacts.map((c, i) => (
          <div className="fl" key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--ln)" }}>
            <label className="f">Name<input value={c.name} onChange={(e) => upd(i, "name", e.target.value)} /></label>
            <label className="f">Designation<input value={c.designation} placeholder="Marketing head" onChange={(e) => upd(i, "designation", e.target.value)} /></label>
            <div className="full">
              <label className="f">Number</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input aria-label="Number" value={c.phone} placeholder="+91 98765 43210" onChange={(e) => upd(i, "phone", e.target.value)} />
                <button aria-label="Remove contact" onClick={() => setF((p) => ({ ...p, contacts: p.contacts.filter((_, j) => j !== i) }))}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="p" style={{ width: "100%" }} disabled={busy} onClick={async () => (await run(() => patch(`/api/companies/${company.id}`, { name: f.name, category: f.category, notes: f.notes, contacts: f.contacts.map((c) => ({ ...c, phone: normPhone(c.phone) })) }), "Saved")) && reload()}>
        {busy ? "Saving…" : "Save"}
      </button>
    </>
  );
}
