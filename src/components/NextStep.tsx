"use client";
import { useState } from "react";
import { patch } from "@/lib/client";
import { fmtDate } from "@/lib/format";
import { addDays, daysBetween, STAGE_DAYS, todayIST } from "@/lib/priority";
import { Field, Modal, Tag, useAction } from "./ui";

export type StepTarget = { kind: "college" | "deal"; id: number; stage: string; title: string; nextAction: string; nextActionDue: string | null };
const url = (t: StepTarget) => (t.kind === "college" ? `/api/colleges/${t.id}` : `/api/deals/${t.id}`);

/** "Overdue 2 days", "Due today", "Due in 3 days", "Due 14 Nov". */
export function dueLabel(due: string | null, today = todayIST()): { text: string; tone?: "r" | "w" | "g" } | null {
  if (!due) return null;
  const d = daysBetween(today, due);
  if (d < 0) return { text: `Overdue ${-d} day${d === -1 ? "" : "s"}`, tone: "r" };
  if (d === 0) return { text: "Due today", tone: "w" };
  if (d === 1) return { text: "Due tomorrow", tone: "w" };
  if (d <= 7) return { text: `Due in ${d} days` };
  return { text: `Due ${fmtDate(due)}` };
}
export const DueTag = ({ due }: { due: string | null }) => {
  const l = dueLabel(due);
  return l ? <Tag tone={l.tone}>{l.text}</Tag> : null;
};

const nextMonday = (t: string) => {
  const dow = new Date(t + "T00:00:00Z").getUTCDay(); // 0 Sun … 6 Sat
  return addDays(t, ((8 - dow) % 7) || 7);
};

/** Date picker with one-tap presets; any date can be typed or picked. */
export function DuePicker({ value, onChange, presets = true }: { value: string; onChange: (v: string) => void; presets?: boolean }) {
  const t = todayIST();
  const opts: [string, string][] = [
    ["Today", t],
    ["Tomorrow", addDays(t, 1)],
    ["In 3 days", addDays(t, 3)],
    ["Next Monday", nextMonday(t)],
    ["In 2 weeks", addDays(t, 14)],
  ];
  return (
    <div>
      {presets && (
        <div className="seg" style={{ marginBottom: 6 }}>
          {opts.map(([l, v]) => (
            <button key={l} type="button" className={`sm${value === v ? " on" : ""}`} onClick={() => onChange(v)}>
              {l}
            </button>
          ))}
        </div>
      )}
      <input type="date" aria-label="Due date" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/**
 * mode "done": marks the current step done and asks for the next one.
 * mode "edit": change the step text and date.
 * mode "snooze": move only the date.
 */
export function NextStepModal({ target, mode, onClose, onDone }: { target: StepTarget; mode: "done" | "edit" | "snooze"; onClose: () => void; onDone: () => void }) {
  const suggest = addDays(todayIST(), STAGE_DAYS[target.stage] ?? 3);
  const [action, setAction] = useState(mode === "done" ? "" : target.nextAction);
  const [due, setDue] = useState(mode === "done" ? suggest : (target.nextActionDue ?? (mode === "snooze" ? addDays(todayIST(), 1) : suggest)));
  const { busy, error, run } = useAction();
  const save = (body: object, msg: string) => run(() => patch(url(target), body), msg).then((ok) => ok && onDone());

  const title = mode === "snooze" ? `Snooze: ${target.title}` : mode === "done" ? `Done: ${target.nextAction || "next step"}` : `Next step: ${target.title}`;
  return (
    <Modal onClose={onClose} title={title}>
      {mode === "done" && <p className="sub" style={{ marginTop: 0 }}>What's the next step for {target.title}?</p>}
      {mode === "snooze" && target.nextAction && <p className="sub" style={{ marginTop: 0 }}>{target.nextAction}</p>}
      <div className="fl">
        {mode !== "snooze" && (
          <Field full label="Next step">
            <input value={action} placeholder="Send rate card, call convenor, follow up on deck…" onChange={(e) => setAction(e.target.value)} />
          </Field>
        )}
        <Field full label={mode === "snooze" ? "Snooze until" : "Due date"}>
          <DuePicker value={due ?? ""} onChange={setDue} />
        </Field>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button
          className="p"
          style={{ flex: 1 }}
          disabled={busy || !due}
          onClick={() => save(mode === "snooze" ? { nextActionDue: due } : { nextAction: action.trim(), nextActionDue: due }, mode === "snooze" ? `Snoozed to ${fmtDate(due)}` : "Next step saved")}
        >
          {mode === "snooze" ? "Snooze" : "Save next step"}
        </button>
        {mode !== "snooze" && (
          <button disabled={busy} onClick={() => save({ nextAction: "", nextActionDue: null }, mode === "done" ? "Marked done" : "Next step cleared")}>
            {mode === "done" ? "No next step for now" : "Clear"}
          </button>
        )}
      </div>
    </Modal>
  );
}
