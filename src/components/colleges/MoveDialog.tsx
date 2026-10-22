"use client";
import { useState } from "react";
import { post } from "@/lib/client";
import { COLLEGE_STAGE_DESC, LOST_REASONS, STAGE_LABEL, type CollegeStage } from "@/lib/stages";
import type { College } from "@/lib/types";
import { Field, Modal, NumField, TextField, useAction } from "../ui";

/** Stages that need something captured before the deal can move there. */
export const NEEDS_FORM: string[] = ["requirements_received", "rates_proposed", "locked", "lost"];

export function MoveDialog({ college, to, onClose, onDone }: { college: College; to: CollegeStage; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    artistBudget: college.artistBudget,
    prodBudget: college.prodBudget,
    wishlist: college.wishlist,
    scopeNotes: college.scopeNotes,
    proposedArtistRate: college.proposedArtistRate,
    proposedProdRate: college.proposedProdRate,
    proposalNotes: college.proposalNotes,
    dealAmount: college.dealAmount,
    dealDeliverables: college.dealDeliverables,
  });
  const [reason, setReason] = useState(LOST_REASONS[0]);
  const { busy, error, run } = useAction();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const fields =
    to === "requirements_received"
      ? { artistBudget: f.artistBudget, prodBudget: f.prodBudget, wishlist: f.wishlist, scopeNotes: f.scopeNotes }
      : to === "rates_proposed"
        ? { proposedArtistRate: f.proposedArtistRate, proposedProdRate: f.proposedProdRate, proposalNotes: f.proposalNotes }
        : to === "locked"
          ? { dealAmount: f.dealAmount, dealDeliverables: f.dealDeliverables }
          : undefined;

  return (
    <Modal onClose={onClose} title={`Move ${college.name} to ${STAGE_LABEL[to]}`}>
      <p className="sub" style={{ marginTop: 0 }}>
        {COLLEGE_STAGE_DESC[to]}
      </p>
      <div className="fl">
        {to === "requirements_received" && (
          <>
            <NumField label="Total artist budget (₹)" value={f.artistBudget} onChange={(n) => set("artistBudget", n)} />
            <NumField label="Production budget (₹)" value={f.prodBudget} onChange={(n) => set("prodBudget", n)} />
            <TextField full label="Expected artists / wishlist" value={f.wishlist} onChange={(v) => set("wishlist", v)} />
            <TextField full label="Scope comments" value={f.scopeNotes} onChange={(v) => set("scopeNotes", v)} />
          </>
        )}
        {to === "rates_proposed" && (
          <>
            <NumField label="Proposed artist rate (₹)" value={f.proposedArtistRate} onChange={(n) => set("proposedArtistRate", n)} hint="Required: this or the production rate" />
            <NumField label="Proposed production rate (₹)" value={f.proposedProdRate} onChange={(n) => set("proposedProdRate", n)} />
            <TextField full label="What was sent (roster, package, terms)" value={f.proposalNotes} onChange={(v) => set("proposalNotes", v)} />
          </>
        )}
        {to === "locked" && (
          <>
            <NumField full label="Final amount (₹)" value={f.dealAmount} onChange={(n) => set("dealAmount", n)} hint="Required" />
            <Field full label="Deliverables (required)">
              <textarea rows={3} value={f.dealDeliverables} onChange={(e) => set("dealDeliverables", e.target.value)} placeholder="Artists, production scope, branding commitments" />
            </Field>
          </>
        )}
        {to === "lost" && (
          <Field full label="Why was it lost?">
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {LOST_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
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
          const ok = await run(() => post(`/api/colleges/${college.id}/stage`, { to, reason: to === "lost" ? reason : undefined, fields }), to === "lost" ? "Marked lost" : `Moved to ${STAGE_LABEL[to]}`);
          if (ok) onDone();
        }}
      >
        {busy ? "Saving…" : to === "lost" ? "Mark lost" : `Move to ${STAGE_LABEL[to]}`}
      </button>
    </Modal>
  );
}
