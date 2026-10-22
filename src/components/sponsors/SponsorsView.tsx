"use client";
import { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher, post } from "@/lib/client";
import { inr } from "@/lib/format";
import { DEAL_STAGES, DEAL_STAGE_DESC, STAGE_LABEL, type DealStage } from "@/lib/stages";
import type { CompanyRow, Contact, Deal, Me } from "@/lib/types";
import { Modal, Seg, Tag, TextField, useAction, useToast } from "../ui";
import { CompanyDrawer } from "./CompanyDrawer";
import { DEAL_NEEDS_FORM, DealMoveDialog, DealModal, dealTone } from "./DealParts";

export function SponsorsView({ me }: { me: Me }) {
  const toast = useToast();
  const { mutate } = useSWRConfig();
  const { data: companies, error } = useSWR<CompanyRow[]>("/api/companies", fetcher);
  const { data: deals } = useSWR<Deal[]>("/api/deals", fetcher);
  const [view, setView] = useState<"list" | "board">("list");
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [excl, setExcl] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [reach, setReach] = useState<CompanyRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [move, setMove] = useState<{ deal: Deal; to: DealStage } | null>(null);
  const admin = me.role !== "executive";
  // colleges, sponsors and the roster share data (history creates companies and shows), so refresh every list after a save
  const refresh = () => mutate((k) => typeof k === "string" && k.startsWith("/api/"));

  const rows = useMemo(
    () =>
      (companies ?? []).filter((c) => {
        if (q && !(c.name + c.category).toLowerCase().includes(q.toLowerCase())) return false;
        if (view === "list") {
          if (stage === "none" && c.latestStage) return false;
          if (stage && stage !== "none" && c.latestStage !== stage) return false;
          if (excl && !c.exclusive) return false;
        }
        return true;
      }),
    [companies, q, stage, excl, view],
  );
  const nf = (q ? 1 : 0) + (view === "list" ? (stage ? 1 : 0) + (excl ? 1 : 0) : 0);
  const clear = () => {
    setQ("");
    setStage("");
    setExcl(false);
  };
  const byId = useMemo(() => new Map((companies ?? []).map((c) => [c.id, c])), [companies]);
  const shownIds = new Set(rows.map((r) => r.id));
  const boardDeals = (deals ?? []).filter((d) => shownIds.has(d.companyId));
  const uncontacted = rows.filter((r) => !r.deals);

  async function requestMove(d: Deal, to: DealStage) {
    if (d.stage === to) return;
    const fi = DEAL_STAGES.indexOf(d.stage as DealStage);
    const forward = DEAL_STAGES.indexOf(to) > fi && d.stage !== "locked" && d.stage !== "lost";
    if (to === "lost" || (forward && DEAL_NEEDS_FORM.includes(to))) return setMove({ deal: d, to });
    try {
      await post(`/api/deals/${d.id}/stage`, { to });
      toast(`Moved to ${STAGE_LABEL[to]}`);
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't move", true);
    }
  }
  const step = (d: Deal, k: number) => {
    const i = DEAL_STAGES.indexOf(d.stage as DealStage) + k;
    if (i >= 0 && i < DEAL_STAGES.length) requestMove(d, DEAL_STAGES[i]);
  };
  async function startDeal(companyId: number, to: DealStage) {
    try {
      const r = await post<{ id: number }>("/api/deals", { companyId });
      await refresh();
      const fresh = { id: r.id, companyId, stage: "reach_out", amount: 0, deliverables: "" } as Deal;
      if (to !== "reach_out") await requestMove(fresh, to);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't start the deal", true);
    }
  }

  return (
    <>
      <div className="top">
        <h2>
          Sponsorships <span className="sub">{rows.length}</span>
        </h2>
        <button className="p" onClick={() => setAdding(true)}>
          + Add company
        </button>
      </div>
      <p className="sub" style={{ marginTop: 0 }}>
        Companies appear here automatically from each college's sponsor history. Open one to see every fest it sponsored, then log each outreach and move the deal through its stages.
      </p>
      <div className="seg">
        <span style={{ flex: 1 }} />
        <Seg value={view} onChange={setView} items={[["list", "Companies"], ["board", "Board"]]} />
      </div>
      <div className="bar b3">
        <input aria-label="Search" placeholder="Search company or category" value={q} onChange={(e) => setQ(e.target.value)} />
        {view === "list" ? (
          <>
            <select aria-label="Stage" value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">Stage</option>
              <option value="none">Not contacted</option>
              {DEAL_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
            <select aria-label="Exclusive" value={excl ? "1" : ""} onChange={(e) => setExcl(!!e.target.value)}>
              <option value="">Exclusive: any</option>
              <option value="1">Exclusive only</option>
            </select>
          </>
        ) : (
          <>
            <span />
            <span />
          </>
        )}
      </div>
      {nf > 0 && (
        <div style={{ margin: "-4px 0 12px" }}>
          <button onClick={clear}>✕ Clear all filters ({nf})</button>
        </div>
      )}
      {error && <div className="box err">{String(error.message)}</div>}
      {!companies && !error && <div className="box sub">Loading companies…</div>}
      {companies && !rows.length && <div className="box">No companies match. Clear a filter or add a company.</div>}

      {view === "list" && rows.length > 0 && (
        <>
          <div className="row h b5">
            <span>Company</span>
            <span>Colleges sponsored</span>
            <span>Years</span>
            <span>Stage</span>
            <span />
          </div>
          {rows.map((c) => (
            <div className="row b5" key={c.id}>
              <div>
                <button className="lnk" onClick={() => setOpenId(c.id)}>{c.name}</button>
                <div className="sub">{c.category || "Category not set"}</div>
              </div>
              <span>
                {c.colleges} college{c.colleges === 1 ? "" : "s"}
                <div className="sub">{inr(c.total)} total</div>
              </span>
              <span>
                {c.years.length ? c.years.join(", ") : <span className="sub">—</span>}
                {c.exclusive && <div><Tag tone="w">Exclusive</Tag></div>}
              </span>
              <span>{c.latestStage ? <Tag tone={dealTone(c.latestStage)}>{STAGE_LABEL[c.latestStage]}</Tag> : <Tag>Not contacted</Tag>}</span>
              <span>
                <button className="p" onClick={() => setReach(c)}>Reach out</button>
              </span>
            </div>
          ))}
        </>
      )}

      {view === "board" && rows.length > 0 && (
        <div className="kan k7">
          <div className="col">
            <h3>Not contacted <span className="sub">{uncontacted.length}</span></h3>
            <div className="sub" style={{ padding: "0 4px 8px" }}>No outreach yet. Drag a company into a stage to start a deal.</div>
            {uncontacted.map((c) => (
              <div key={c.id} className="card" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", `c:${c.id}`)} onClick={() => setOpenId(c.id)}>
                <b>{c.name}</b>
                <div className="sub">{c.category || "Category not set"} · {c.colleges} college{c.colleges === 1 ? "" : "s"}</div>
              </div>
            ))}
          </div>
          {DEAL_STAGES.map((s) => {
            const L = boardDeals.filter((d) => d.stage === s);
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
                  const p = e.dataTransfer.getData("text/plain");
                  if (p.startsWith("c:")) startDeal(+p.slice(2), s);
                  else {
                    const d = (deals ?? []).find((x) => x.id === +p);
                    if (d) requestMove(d, s);
                  }
                }}
              >
                <h3>{STAGE_LABEL[s]} <span className="sub">{L.length}</span></h3>
                <div className="sub" style={{ padding: "0 4px 8px" }}>{DEAL_STAGE_DESC[s]}</div>
                {L.map((d) => (
                  <div key={d.id} className="card" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(d.id))} onClick={() => setOpenId(d.companyId)}>
                    <b>{byId.get(d.companyId)?.name ?? d.company}</b>
                    <div className="sub">{d.college ?? "Overall"}{d.year ? ` · ${d.year}` : ""}</div>
                    <div className="sub">{d.amount ? inr(d.amount) : "Amount not set"}{d.exclusive ? " · Exclusive" : ""}</div>
                    <div className="mv" onClick={(e) => e.stopPropagation()}>
                      <button aria-label="Move back" disabled={!admin} title={admin ? "Move back" : "Only an admin can move a deal backward"} onClick={() => step(d, -1)}>◀</button>
                      <button aria-label="Move forward" onClick={() => step(d, 1)}>▶</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {openId && <CompanyDrawer id={openId} me={me} onClose={() => setOpenId(null)} onChanged={refresh} />}
      {reach && <ReachLoader company={reach} onClose={() => setReach(null)} onDone={() => { setReach(null); refresh(); }} />}
      {adding && <AddCompany onClose={() => setAdding(false)} onDone={(id) => { setAdding(false); refresh(); setOpenId(id); }} />}
      {move && (
        <DealMoveDialog
          deal={move.deal}
          name={byId.get(move.deal.companyId)?.name ?? "deal"}
          to={move.to}
          onClose={() => setMove(null)}
          onDone={() => {
            setMove(null);
            refresh();
          }}
        />
      )}
    </>
  );
}

function ReachLoader({ company, onClose, onDone }: { company: CompanyRow; onClose: () => void; onDone: () => void }) {
  const { data } = useSWR<{ contacts: Contact[] }>(`/api/companies/${company.id}`, fetcher);
  if (!data) return null;
  return <DealModal companyId={company.id} companyName={company.name} contacts={data.contacts} onClose={onClose} onDone={onDone} />;
}

function AddCompany({ onClose, onDone }: { onClose: () => void; onDone: (id: number) => void }) {
  const [f, setF] = useState({ name: "", category: "", contactName: "", phone: "", notes: "" });
  const { busy, error, run } = useAction();
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal onClose={onClose} title="Add company" wide>
      <p className="sub" style={{ marginTop: 0 }}>Companies that already sponsored a college appear on their own. Add one here to start outreach before it has any history.</p>
      <div className="fl">
        <TextField full label="Company name" value={f.name} onChange={(v) => set("name", v)} />
        <TextField label="Category" value={f.category} onChange={(v) => set("category", v)} ph="Beverage, Audio" />
        <TextField label="Contact person" value={f.contactName} onChange={(v) => set("contactName", v)} />
        <TextField full label="Contact number" value={f.phone} onChange={(v) => set("phone", v)} ph="+91 98765 43210" />
        <TextField full label="Notes" value={f.notes} onChange={(v) => set("notes", v)} />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <button
        className="p"
        style={{ width: "100%", marginTop: 14 }}
        disabled={busy}
        onClick={async () => {
          let id = 0;
          const ok = await run(async () => {
            const r = await post<{ id: number }>("/api/companies", { name: f.name, category: f.category, notes: f.notes, contacts: f.contactName || f.phone ? [{ name: f.contactName, designation: "", phone: f.phone }] : [] });
            id = r.id;
          }, "Company added");
          if (ok) onDone(id);
        }}
      >
        Add company
      </button>
    </Modal>
  );
}
