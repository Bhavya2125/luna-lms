"use client";
import { useState } from "react";
import { patch } from "@/lib/client";
import { fmtDate } from "@/lib/format";
import { addDays, daysBetween, todayIST } from "@/lib/priority";
import { Field, Modal, Tag, useAction } from "./ui";

export type StepTarget = { kind: "college" | "deal"; id: number; stage: string; title: string; nextAction: string; nextActionDue: string | null; targetDate?: string | null };
const url = (t: StepTarget) => (t.kind === "college" ? `/api/colleges/${t.id}` : `/api/deals/${t.id}`);

/** "Overdue 2 days", "Due today", "Due in 3 days", "Due 14 Nov" (prefix changes it to "Target …"). */
export function dateLabel(date: string | null | undefined, prefix = "Due", today = todayIST()): { text: string; tone?: "r" | "w" } | null {
  if (!date) return null;
  const d = daysBetween(today, date);
  if (d < 0) return { text: prefix === "Due" ? `Overdue ${-d} day${d === -1 ? "" : "s"}` : `${prefix} passed ${-d}d ago`, tone: "r" };
  if (d === 0) return { text: `${prefix} today`, tone: "w" };
  if (d === 1) return { text: `${prefix} tomorrow`, tone: "w" };
  if (d <= 7) return { text: `${prefix} in ${d} days` };
  return { text: `${prefix} ${fmtDate(date)}` };
}
export const DueTag = ({ due }: { due: string | null | undefined }) => {
  const l = dateLabel(due);
  return l ? <Tag tone={l.tone}>{l.text}</Tag> : null;
};
export const TargetTag = ({ date }: { date: string | null | undefined }) => {
  const l = dateLabel(date, "Target");
  return l ? <Tag tone={l.tone}>🎯 {l.text}</Tag> : null;
};

const nextMonday = (t: string) => {
  const dow = new Date(t + "T00:00:00Z").getUTCDay(); // 0 Sun … 6 Sat
  return addDays(t, (8 - dow) % 7 || 7);
};

/** One-tap presets plus a date field for any custom date. "No date" clears it when allowed. */
export function DuePicker({ value, onChange, allowNone = true }: { value: string; onChange: (v: string) => void; allowNone?: boolean }) {
  const t = todayIST();
  const opts: [string, string][] = [
    ...(allowNone ? ([["No date", ""]] as [string, string][]) : []),
    ["Today", t],
    ["Tomorrow", addDays(t, 1)],
    ["In 3 days", addDays(t, 3)],
    ["Next Monday", nextMonday(t)],
    ["In 2 weeks", addDays(t, 14)],
  ];
  return (
    <div>
      <div className="seg" style={{ marginBottom: 6 }}>
        {opts.map(([l, v]) => (
          <button key={l} type="button" className={`sm${value === v ? " on" : ""}`} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
      <input type="date" aria-label="Pick a date" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/**
 * mode "done": marks the current step done and asks for the next one (date optional).
 * mode "edit": change the step text and date.
 * mode "snooze": move only the date.
 */
export function NextStepModal({ target, mode, onClose, onDone }: { target: StepTarget; mode: "done" | "edit" | "snooze"; onClose: () => void; onDone: () => void }) {
  const [action, setAction] = useState(mode === "done" ? "" : target.nextAction);
  const [due, setDue] = useState(mode === "done" ? "" : (target.nextActionDue ?? (mode === "snooze" ? addDays(todayIST(), 1) : "")));
  const { busy, error, run } = useAction();
  const save = (body: object, msg: string) => run(() => patch(url(target), body), msg).then((ok) => ok && onDone());

  const title = mode === "snooze" ? `Snooze: ${target.title}` : mode === "done" ? `Done: ${target.nextAction || "next step"}` : `Next step: ${target.title}`;
  return (
    <Modal onClose={onClose} title={title}>
      {mode === "done" && <p className="sub" style={{ marginTop: 0 }}>What's the next step for {target.title}? Leave it empty if there's nothing planned.</p>}
      {mode === "snooze" && target.nextAction && <p className="sub" style={{ marginTop: 0 }}>{target.nextAction}</p>}
      <div className="fl">
        {mode !== "snooze" && (
          <Field full label="Next step">
            <input value={action} placeholder="Send rate card, call convenor, follow up on deck…" onChange={(e) => setAction(e.target.value)} />
          </Field>
        )}
        <Field full label={mode === "snooze" ? "Snooze until" : "Due date (optional)"}>
          <DuePicker value={due} onChange={setDue} allowNone={mode !== "snooze"} />
        </Field>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button
          className="p"
          style={{ flex: 1 }}
          disabled={busy || (mode === "snooze" && !due)}
          onClick={() =>
            save(mode === "snooze" ? { nextActionDue: due } : { nextAction: action.trim(), nextActionDue: due || null }, mode === "snooze" ? `Snoozed to ${fmtDate(due)}` : action.trim() ? "Next step saved" : "Marked done")
          }
        >
          {mode === "snooze" ? "Snooze" : "Save"}
        </button>
        {mode === "edit" && (
          <button disabled={busy} onClick={() => save({ nextAction: "", nextActionDue: null }, "Next step cleared")}>
            Clear
          </button>
        )}
      </div>
    </Modal>
  );
}

/** The overall deadline for a college or sponsor deal ("lock by" / "close by"). */
export function TargetModal({ target, onClose, onDone }: { target: StepTarget; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(target.targetDate ?? "");
  const { busy, error, run } = useAction();
  const label = target.kind === "college" ? "Lock by" : "Close by";
  return (
    <Modal onClose={onClose} title={`Target date: ${target.title}`}>
      <p className="sub" style={{ marginTop: 0 }}>
        The overall deadline for this {target.kind === "college" ? "college" : "sponsor deal"}, separate from stages and next steps. It moves up in priority as the date gets close and shows as overdue once it passes.
      </p>
      <Field full label={label}>
        <DuePicker value={date} onChange={setDate} />
      </Field>
      {error && <p className="err" role="alert">{error}</p>}
      <button
        className="p"
        style={{ width: "100%", marginTop: 14 }}
        disabled={busy}
        onClick={() => run(() => patch(url(target), { targetDate: date || null }), date ? `Target set to ${fmtDate(date)}` : "Target removed").then((ok) => ok && onDone())}
      >
        Save target
      </button>
    </Modal>
  );
}
