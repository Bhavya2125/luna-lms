"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/* ---------- toast ---------- */
const ToastCtx = createContext<(msg: string, bad?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; bad: boolean; k: number } | null>(null);
  const toast = useCallback((msg: string, bad = false) => {
    const k = Date.now();
    setT({ msg, bad, k });
    setTimeout(() => setT((c) => (c && c.k === k ? null : c)), bad ? 4500 : 2400);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {t && (
        <div className={`toast${t.bad ? " bad" : ""}`} role="status" aria-live="polite">
          {t.msg}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

/* ---------- overlay (drawer or centred modal) ---------- */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Overlay({ onClose, centered, wide, label, children }: { onClose: () => void; centered?: boolean; wide?: boolean; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.querySelector<HTMLElement>("input,select,textarea")?.focus({ preventScroll: true });
    if (!el?.contains(document.activeElement)) el?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // only the top-most overlay reacts
        const all = document.querySelectorAll("[data-overlay]");
        if (all[all.length - 1] === el?.parentElement) {
          e.stopPropagation();
          onClose();
        }
      }
      if (e.key === "Tab" && el) {
        const f = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      prev?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div data-overlay className={`ov${centered ? " c" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} className={`pn${wide ? " wide" : ""}`}>
        {children}
      </div>
    </div>
  );
}

export const Modal = (p: { onClose: () => void; title: string; wide?: boolean; children: ReactNode }) => (
  <Overlay onClose={p.onClose} centered wide={p.wide} label={p.title}>
    <h3 style={{ marginBottom: 10 }}>{p.title}</h3>
    {p.children}
  </Overlay>
);

export const Drawer = (p: { onClose: () => void; title: string; sub?: ReactNode; children: ReactNode; actions?: ReactNode }) => (
  <Overlay onClose={p.onClose} label={p.title}>
    <div className="top">
      <div>
        <h2>{p.title}</h2>
        {p.sub && <div className="sub">{p.sub}</div>}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {p.actions}
        <button onClick={p.onClose}>Close</button>
      </div>
    </div>
    {p.children}
  </Overlay>
);

/* ---------- small pieces ---------- */
export const Tag = ({ tone, children }: { tone?: "g" | "r" | "w"; children: ReactNode }) => <span className={`tag${tone ? " " + tone : ""}`}>{children}</span>;

export function Seg<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string][] }) {
  return (
    <div className="seg" role="tablist">
      {items.map(([k, l]) => (
        <button key={k} role="tab" aria-selected={value === k} className={value === k ? "on" : ""} onClick={() => onChange(k)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, full, children, hint }: { label: string; full?: boolean; children: ReactNode; hint?: string }) {
  return (
    <div className={full ? "full" : ""}>
      <label className="f">
        {label}
        {children}
      </label>
      {hint && <div className="sub">{hint}</div>}
    </div>
  );
}

export function NumField({ label, value, onChange, full, hint }: { label: string; value: number; onChange: (n: number) => void; full?: boolean; hint?: string }) {
  return (
    <Field label={label} full={full} hint={hint}>
      <input type="number" inputMode="numeric" min={0} value={value || ""} onChange={(e) => onChange(Math.max(0, Math.floor(+e.target.value || 0)))} />
    </Field>
  );
}

export function TextField({ label, value, onChange, full, ph, list, type }: { label: string; value: string; onChange: (s: string) => void; full?: boolean; ph?: string; list?: string; type?: string }) {
  return (
    <Field label={label} full={full}>
      <input type={type ?? "text"} value={value} placeholder={ph} list={list} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function SelectField<V extends string | number>({ label, value, onChange, options, full }: { label: string; value: V; onChange: (v: string) => void; options: [V, string][]; full?: boolean }) {
  return (
    <Field label={label} full={full}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={String(v)} value={v}>
            {l}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Runs a save action, shows its error inline and in a toast, and tracks "busy". */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = useCallback(
    async (fn: () => Promise<unknown>, ok?: string) => {
      setBusy(true);
      setError("");
      try {
        await fn();
        if (ok) toast(ok);
        return true;
      } catch (e) {
        const m = e instanceof Error ? e.message : "Something went wrong";
        setError(m);
        toast(m, true);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { busy, error, run, setError };
}
