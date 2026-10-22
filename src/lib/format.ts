/** Whole rupees → "₹12L", "₹1.5Cr", "₹45,000". */
export function inr(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 10_000_000) return `₹${+(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000) return `₹${+(n / 100_000).toFixed(2)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

/** Digits only; a bare 10-digit number is treated as Indian (+91). Anything longer is kept as typed (international). */
export function normPhone(v: string | null | undefined): string {
  const d = String(v ?? "").replace(/\D/g, "");
  if (d.length === 10) return "91" + d;
  if (d.length === 11 && d.startsWith("0")) return "91" + d.slice(1);
  return d;
}

export const nameKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");

export const collegeKey = (name: string, city: string) => `${nameKey(name)}|${nameKey(city)}`;

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d.length === 10 ? d + "T00:00:00" : d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** "14–16 Feb 2027" from two ISO dates. */
export function fmtRange(start?: string | null, end?: string | null): string {
  if (!start) return "";
  const a = new Date(start + "T00:00:00");
  if (!end || end === start) return fmtDate(start);
  const b = new Date(end + "T00:00:00");
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()}–${b.getDate()} ${a.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
  }
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}
