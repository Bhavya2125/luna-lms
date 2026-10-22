"use client";
import { useState } from "react";
import useSWR from "swr";
import { fetcher, patch, post } from "@/lib/client";
import { DEAL_STAGE_DESC, LOST_REASONS, STAGE_LABEL, type DealStage } from "@/lib/stages";
import type { CollegeRow, Contact, Deal } from "@/lib/types";
import { Field, Modal, NumField, SelectField, TextField, useAction } from "../ui";

export const DEAL_NEEDS_FORM = ["proposal_sent", "locked", "lost"];
export const dealTone = (s: string | null) => (s === "locked" ? "g" : s === "lost" ? "r" : s === "reach_out" || !s ? undefined : "w") as "g" | "r" | "w" | undefined;

export function DealMoveDialog({ deal, name, to, onClose, onDone }: { deal: Deal; name: string; to: DealStage; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(deal.amount);
  const [deliverables, setDeliverables] = useState(deal.deliverables);
  const [reason, setReason] = useState(LOST_REASONS[0]);
  const { busy, error, run } = useAction();
  return (
    <Modal onClose={onClose} title={`Move ${name} to ${STAGE_LABEL[to]}`}>
      <p className="sub" style={{ marginTop: 0 }}>{DEAL_STAGE_DESC[to]}</p>
      <div className="fl">
        {to === "proposal_sent" && <NumField full label="Quoted amount (₹)" value={amount} onChange={setAmount} hint="Required" />}
        {to === "locked" && (
          <>
            <NumField full label="Final amount (₹)" value={amount} onChange={setAmount} hint="Required" />
            <Field full label="Deliverables (required)">
              <textarea rows={3} value={deliverables} onChange={(e) => setDeliverables(e.target.value)} placeholder="Stall, banner, stage branding" />
            </Field>
          </>
        )}
        {to === "lost" && (
          <Field full label="Why was it lost?">
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {LOST_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
        )}
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <button
        className="p"
        style={{ width: "100%", marginTop: 14 }}
        disabled={busy}
        onClick={async () => {
          const fields = to === "proposal_sent" ? { amount } : to === "locked" ? { amount, deliverables } : undefined;
          if (await run(() => post(`/api/deals/${deal.id}/stage`, { to, reason: to === "lost" ? reason : undefined, fields }), to === "lost" ? "Marked lost" : `Moved to ${STAGE_LABEL[to]}`)) onDone();
        }}
      >
        {busy ? "Saving…" : to === "lost" ? "Mark lost" : `Move to ${STAGE_LABEL[to]}`}
      </button>
    </Modal>
  );
}

/** Create a deal for a company (overall or for one college), or edit one. */
export function DealModal({ companyId, companyName, deal, contacts, onClose, onDone }: { companyId: number; companyName: string; deal?: Deal; contacts: Contact[]; onClose: () => void; onDone: () => void }) {
  const { data: colleges } = useSWR<CollegeRow[]>("/api/colleges?tab=all", fetcher);
  const y = new Date().getFullYear();
  const [f, setF] = useState({
    collegeId: deal?.collegeId ? String(deal.collegeId) : "",
    year: deal?.year ? String(deal.year) : "",
    amount: deal?.amount ?? 0,
    deliverables: deal?.deliverables ?? "",
    contactName: deal?.contactName ?? contacts[0]?.name ?? "",
    contactPhone: deal ? (deal.contactPhone ? "+" + deal.contactPhone : "") : contacts[0]?.phone ? "+" + contacts[0].phone : "",
    exclusive: deal?.exclusive ?? false,
    notes: deal?.notes ?? "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const { busy, error, run } = useAction();
  const list = [...(colleges ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Modal onClose={onClose} title={`${deal ? "Edit" : "Reach out to"} ${companyName}`} wide>
      <div className="fl">
        <Field full label="For which fest?">
          <select value={f.collegeId} onChange={(e) => set("collegeId", e.target.value)}>
            <option value="">Overall (all fests)</option>
            {list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <SelectField label="Fest year" value={f.year} onChange={(v) => set("year", v)} options={[["", "Not specific"], ...[y + 1, y, y - 1].map((v) => [String(v), String(v)] as [string, string])]} />
        <NumField label="Amount (₹)" value={f.amount} onChange={(n) => set("amount", n)} />
        <TextField full label="Deliverables" value={f.deliverables} onChange={(v) => set("deliverables", v)} ph="Stall, banner, stage branding" />
        {contacts.length > 0 && (
          <Field full label="Pick a saved contact">
            <select
              value=""
              onChange={(e) => {
                const c = contacts[+e.target.value];
                if (c) setF((p) => ({ ...p, contactName: c.name, contactPhone: c.phone ? "+" + c.phone : "" }));
              }}
            >
              <option value="">Choose a contact</option>
              {contacts.map((c, i) => <option key={i} value={i}>{c.name || "+" + c.phone}{c.designation ? ` · ${c.designation}` : ""}</option>)}
            </select>
          </Field>
        )}
        <TextField label="Contact person" value={f.contactName} onChange={(v) => set("contactName", v)} />
        <TextField label="Contact number" value={f.contactPhone} onChange={(v) => set("contactPhone", v)} ph="+91 98765 43210" />
        <Field label="Exclusive?">
          <select value={f.exclusive ? "yes" : "no"} onChange={(e) => set("exclusive", e.target.value === "yes")}>
            <option value="no">No</option>
            <option value="yes">Yes, exclusive</option>
          </select>
        </Field>
        <TextField label="Notes" value={f.notes} onChange={(v) => set("notes", v)} />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <button
        className="p"
        style={{ width: "100%", marginTop: 14 }}
        disabled={busy}
        onClick={async () => {
          const body = { collegeId: f.collegeId ? +f.collegeId : null, year: f.year ? +f.year : null, amount: f.amount, deliverables: f.deliverables, contactName: f.contactName, contactPhone: f.contactPhone, exclusive: f.exclusive, notes: f.notes };
          const ok = await run(() => (deal ? patch(`/api/deals/${deal.id}`, body) : post("/api/deals", { companyId, ...body })), deal ? "Saved" : "Outreach logged");
          if (ok) onDone();
        }}
      >
        {busy ? "Saving…" : deal ? "Save" : "Log outreach"}
      </button>
    </Modal>
  );
}

