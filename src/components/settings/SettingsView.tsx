"use client";
import { useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher, patch, post } from "@/lib/client";
import { useInstall, usePush } from "@/lib/pwa";
import { ROLES, ROLE_DESC, ROLE_LABEL, type Role } from "@/lib/stages";
import type { Me, TeamUser } from "@/lib/types";
import { Field, Modal, SelectField, Tag, TextField, useAction, useToast } from "../ui";

type Theme = "auto" | "light" | "dark";

export function SettingsView({ me }: { me: Me }) {
  const admin = me.role !== "executive";
  const sup = me.role === "super_admin";
  const { data: team, error } = useSWR<TeamUser[]>(admin ? "/api/users" : null, fetcher);
  const { mutate } = useSWRConfig();
  const [edit, setEdit] = useState<TeamUser | "new" | null>(null);
  const [revoke, setRevoke] = useState<TeamUser | null>(null);
  const toast = useToast();
  const refresh = () => mutate("/api/users");

  return (
    <>
      <div className="top"><h2>Settings</h2></div>
      <Appearance />
      <Notifications />
      <Account me={me} />
      {admin && (
        <>
          <div className="top" style={{ marginTop: 18 }}>
            <h2>Team <span className="sub">{team?.length ?? ""}</span></h2>
            {sup && <button className="p" onClick={() => setEdit("new")}>+ Create user</button>}
          </div>
          <p className="sub" style={{ marginTop: 0 }}>{sup ? "Create accounts, change roles, reset passwords and revoke access." : "You can see the team. Only a Super Admin can change access."}</p>
          {error && <div className="box err">{String(error.message)}</div>}
          {(team ?? []).map((u) => (
            <div className="row b2" key={u.id}>
              <div>
                <b style={{ cursor: "default" }}>{u.name}</b> {u.id === me.id && <Tag>You</Tag>}
                <div className="sub">@{u.username} · {u.colleges} college{u.colleges === 1 ? "" : "s"} assigned</div>
              </div>
              <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <Tag>{ROLE_LABEL[u.role]}</Tag>
                <Tag tone={u.active ? "g" : "r"}>{u.active ? "Active" : "Access revoked"}</Tag>
                {sup && <button onClick={() => setEdit(u)}>Edit</button>}
                {sup && u.id !== me.id && (u.active ? <button onClick={() => setRevoke(u)}>Revoke</button> : <button onClick={async () => { try { await patch(`/api/users/${u.id}`, { active: true }); toast(`${u.name} can sign in again`); refresh(); } catch (e) { toast(e instanceof Error ? e.message : "Couldn't restore", true); } }}>Restore</button>)}
              </span>
            </div>
          ))}
          <div className="box" style={{ marginTop: 12 }}>
            <h3>What each role can do</h3>
            {ROLES.map((r) => <p className="sub" key={r}><b>{ROLE_LABEL[r]}</b>: {ROLE_DESC[r]}</p>)}
          </div>
        </>
      )}
      {edit && <UserModal me={me} user={edit === "new" ? null : edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); refresh(); }} />}
      {revoke && <RevokeModal user={revoke} onClose={() => setRevoke(null)} onDone={() => { setRevoke(null); refresh(); }} />}
    </>
  );
}

function Appearance() {
  const [theme, setTheme] = useState<Theme>("auto");
  useEffect(() => {
    try {
      const t = localStorage.getItem("lw_theme");
      if (t === "light" || t === "dark") setTheme(t);
    } catch {}
  }, []);
  function choose(t: Theme) {
    setTheme(t);
    try {
      if (t === "auto") {
        localStorage.removeItem("lw_theme");
        document.documentElement.removeAttribute("data-theme");
      } else {
        localStorage.setItem("lw_theme", t);
        document.documentElement.setAttribute("data-theme", t);
      }
    } catch {}
  }
  return (
    <div className="box">
      <h3>Appearance</h3>
      <p className="sub">Choose light, dark or follow your device.</p>
      <div className="seg" style={{ marginBottom: 0 }} role="radiogroup" aria-label="Theme">
        {(["auto", "light", "dark"] as Theme[]).map((t) => (
          <button key={t} role="radio" aria-checked={theme === t} className={theme === t ? "on" : ""} onClick={() => choose(t)}>
            {t === "auto" ? "Match device" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Notifications() {
  const push = usePush();
  const inst = useInstall();
  return (
    <div className="box">
      <h3>Alerts and app</h3>
      <p className="sub">Get a push alert one month before each fest, on this device.</p>
      {push.supported ? (
        <p>
          <button className={push.on ? "" : "p"} disabled={push.busy} onClick={push.on ? push.disable : push.enable}>
            {push.on ? "Turn off push alerts" : "Turn on push alerts"}
          </button>{" "}
          {push.on && <Tag tone="g">On for this device</Tag>}
        </p>
      ) : (
        <p className="sub">Push alerts aren't available here. {inst.ios && !inst.installed ? "On iPhone, add Luna Wave to your Home Screen first (Share, then Add to Home Screen)." : "They need a browser that supports web push and a configured server key."}</p>
      )}
      {push.error && <p className="err">{push.error}</p>}
      {inst.installed ? (
        <Tag tone="g">Installed as an app</Tag>
      ) : inst.canInstall ? (
        <button onClick={inst.install}>Install Luna Wave</button>
      ) : (
        <p className="sub" style={{ margin: 0 }}>{inst.ios ? "To install: tap Share, then Add to Home Screen." : "To install: use your browser's Install or Add to Home Screen option."}</p>
      )}
    </div>
  );
}

function Account({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="box">
      <h3>Your account</h3>
      <div className="sub">{me.name} · @{me.username}</div>
      <p style={{ margin: "6px 0 8px" }}><Tag>{ROLE_LABEL[me.role]}</Tag></p>
      <button onClick={() => setOpen(true)}>Change password</button>
      {open && <PasswordModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const { busy, error, run } = useAction();
  return (
    <Modal onClose={onClose} title="Change password">
      <div className="fl">
        <TextField full type="password" label="Current password" value={cur} onChange={setCur} />
        <TextField full type="password" label="New password (8+ characters)" value={nw} onChange={setNw} />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="p" style={{ width: "100%", marginTop: 12 }} disabled={busy} onClick={async () => (await run(() => post("/api/me/password", { current: cur, next: nw }), "Password changed. Other devices were signed out.")) && onClose()}>
        Change password
      </button>
    </Modal>
  );
}

function UserModal({ me, user, onClose, onDone }: { me: Me; user: TeamUser | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: user?.name ?? "", username: user?.username ?? "", password: "", role: (user?.role ?? "executive") as Role });
  const { busy, error, run } = useAction();
  const self = user?.id === me.id;
  return (
    <Modal onClose={onClose} title={user ? "Edit user" : "Create user"}>
      <div className="fl">
        <TextField label="Name" value={f.name} onChange={(v) => setF((p) => ({ ...p, name: v }))} />
        <TextField label="Username" value={f.username} onChange={(v) => setF((p) => ({ ...p, username: v }))} />
        <Field label={user ? "New password (leave blank to keep)" : "Password (8+ characters)"}>
          <input type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF((p) => ({ ...p, password: e.target.value }))} />
        </Field>
        <div>
          <SelectField label="Role" value={f.role} onChange={(v) => setF((p) => ({ ...p, role: v as Role }))} options={ROLES.map((r) => [r, ROLE_LABEL[r]] as [Role, string])} />
          {self && <div className="sub">You can't change your own role.</div>}
        </div>
      </div>
      <p className="sub">{ROLE_DESC[f.role]}</p>
      {error && <p className="err" role="alert">{error}</p>}
      <button
        className="p"
        style={{ width: "100%", marginTop: 6 }}
        disabled={busy}
        onClick={async () => {
          const body = { name: f.name, username: f.username, role: self ? undefined : f.role, password: f.password || undefined };
          const ok = await run(() => (user ? patch(`/api/users/${user.id}`, body) : post("/api/users", { ...body, role: f.role, password: f.password })), user ? (f.password ? "Saved. Share the new password directly." : "Changes saved") : "User created. Share the password directly.");
          if (ok) onDone();
        }}
      >
        {user ? "Save changes" : "Create user"}
      </button>
    </Modal>
  );
}

function RevokeModal({ user, onClose, onDone }: { user: TeamUser; onClose: () => void; onDone: () => void }) {
  const { busy, error, run } = useAction();
  return (
    <Modal onClose={onClose} title={`Revoke access for ${user.name}?`}>
      <p className="sub">They are signed out everywhere and can't sign in until you restore access. Their assigned colleges stay as they are, so reassign them if needed.</p>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="p" disabled={busy} onClick={async () => (await run(() => patch(`/api/users/${user.id}`, { active: false }), `Access revoked for ${user.name}`)) && onDone()}>Revoke access</button>{" "}
      <button onClick={onClose}>Cancel</button>
    </Modal>
  );
}
