import { MONTHS } from "./stages";

export function parseCSV(t: string): string[][] {
  const rows: string[][] = [];
  let r: string[] = [];
  let f = "";
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      r.push(f);
      f = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      r.push(f);
      f = "";
      if (r.some((x) => x.trim())) rows.push(r);
      r = [];
    } else f += ch;
  }
  r.push(f);
  if (r.some((x) => x.trim())) rows.push(r);
  return rows.map((x) => x.map((y) => y.trim()));
}

/** Month number (1-12), month name, or a date (dd/mm/yyyy or yyyy-mm-dd). Returns a 0-based month and, for full dates, the ISO date. */
export function parseMonth(v: string): { month: number; date?: string } | null {
  v = v.trim();
  let m: RegExpMatchArray | null;
  if (/^\d{1,2}$/.test(v)) {
    const n = +v;
    return n >= 1 && n <= 12 ? { month: n - 1 } : null;
  }
  if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return Number.isNaN(d.getTime()) ? null : { month: d.getMonth(), date: v };
  }
  if ((m = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/))) {
    if (+m[2] > 12 || +m[1] > 31) return null;
    const y = +(m[3].length === 2 ? "20" + m[3] : m[3]);
    const d = new Date(y, +m[2] - 1, +m[1]);
    if (Number.isNaN(d.getTime())) return null;
    const iso = `${y}-${String(+m[2]).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`;
    return { month: d.getMonth(), date: iso };
  }
  if (/^[A-Za-z]{3,}$/.test(v)) {
    const i = MONTHS.findIndex((x) => x.toLowerCase().startsWith(v.slice(0, 3).toLowerCase()));
    return i < 0 ? null : { month: i };
  }
  return null;
}

export const normFestType = (v: string) => (/tech/i.test(v) ? "technical" : /cult/i.test(v) ? "cultural" : "other") as "technical" | "cultural" | "other";
