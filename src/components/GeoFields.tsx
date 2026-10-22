"use client";
import { useState } from "react";
import useSWR from "swr";
import { Field } from "./ui";

type Geo = Record<string, string[]>;

/** State and city pickers for India. The city list follows the chosen state, with "Other" for places not listed. */
export function GeoFields({ state, city, onChange }: { state: string; city: string; onChange: (state: string, city: string) => void }) {
  const { data } = useSWR<Geo>("/geo/india.json", (u: string) => fetch(u).then((r) => r.json()), { revalidateOnFocus: false });
  const states = Object.keys(data ?? {});
  const cities = [...new Set([...(data?.[state] ?? []), ...(city && state ? [city] : [])])].sort((a, b) => a.localeCompare(b));
  const listed = !city || cities.includes(city);
  const [other, setOther] = useState(false);
  const showOther = other || (!!city && !listed);

  return (
    <>
      <Field label="State">
        <select
          value={state}
          onChange={(e) => {
            setOther(false);
            onChange(e.target.value, "");
          }}
        >
          <option value="">Select state</option>
          {states.map((s) => (
            <option key={s}>{s}</option>
          ))}
          {state && !states.includes(state) && <option>{state}</option>}
        </select>
      </Field>
      <Field label="City">
        <select
          value={showOther ? "__o" : city}
          disabled={!state}
          onChange={(e) => {
            if (e.target.value === "__o") {
              setOther(true);
              onChange(state, "");
            } else {
              setOther(false);
              onChange(state, e.target.value);
            }
          }}
        >
          <option value="">{state ? "Select city" : "Select state first"}</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
          {state && <option value="__o">Other (type it)</option>}
        </select>
        {showOther && <input style={{ marginTop: 6 }} placeholder="Type city name" value={city} onChange={(e) => onChange(state, e.target.value)} />}
      </Field>
    </>
  );
}
