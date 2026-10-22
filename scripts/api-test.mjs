// End-to-end checks of the access rules against a running dev server with seeded demo data.
//   BASE=http://localhost:3100 SEED_PASSWORD=... node scripts/api-test.mjs
const BASE = process.env.BASE ?? "http://localhost:3100";
const PW = process.env.SEED_PASSWORD ?? "lunawave-dev-1";
const stamp = Date.now().toString(36);
let pass = 0;
let fail = 0;

class Client {
  cookie = "";
  async req(method, path, body, headers = {}) {
    const res = await fetch(BASE + path, {
      method,
      redirect: "manual",
      headers: { "content-type": "application/json", cookie: this.cookie, ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) this.cookie = set.split(";")[0];
    let json = null;
    try {
      json = await res.json();
    } catch {}
    return { status: res.status, json };
  }
  async login(u, p = PW) {
    const r = await this.req("POST", "/api/auth/login", { username: u, password: p });
    return r;
  }
}
const check = (name, cond, extra = "") => {
  if (cond) pass++;
  else {
    fail++;
    console.log("FAIL", name, extra);
  }
};
const as = async (u) => {
  const c = new Client();
  const r = await c.login(u);
  if (r.status !== 200) throw new Error(`login ${u} failed: ${r.status}`);
  return c;
};

const anon = new Client();
check("anon blocked", (await anon.req("GET", "/api/colleges")).status === 401);
check("bad password", (await new Client().login("rohan", "wrong-password")).status === 401);

const rohan = await as("rohan");
const isha = await as("isha");
const aarav = await as("aarav");

// visibility
const rc = (await rohan.req("GET", "/api/colleges")).json;
check("exec sees only assigned colleges", rc.length >= 5 && rc.every((c) => c.assignees.some((a) => a.name === "Rohan Verma")), JSON.stringify(rc.map((c) => c.name)));
const ac = (await isha.req("GET", "/api/colleges")).json;
check("admin sees all colleges", ac.length >= 10);
const bits = ac.find((c) => c.name === "BITS Pilani");
check("exec cannot open an unassigned college", (await rohan.req("GET", `/api/colleges/${bits.id}`)).status === 403);
check("exec cannot move an unassigned college", (await rohan.req("POST", `/api/colleges/${bits.id}/stage`, { to: "initial_connect" })).status === 403);

// college stages
const mk = await rohan.req("POST", "/api/colleges", { name: `Stage Test ${stamp}`, city: "Pune", festMonth: 7, days: 2 });
const iitb = { id: mk.json.id };
let r = await rohan.req("POST", `/api/colleges/${iitb.id}/stage`, { to: "rates_proposed" });
check("rates proposed needs a captured rate", r.status === 400 && /rate/i.test(r.json.error), JSON.stringify(r.json));
r = await rohan.req("POST", `/api/colleges/${iitb.id}/stage`, { to: "rates_proposed", fields: { proposedArtistRate: 2000000, proposalNotes: "Sent deck" } });
check("rates proposed with rate ok", r.status === 200, JSON.stringify(r.json));
r = await rohan.req("POST", `/api/colleges/${iitb.id}/stage`, { to: "locked" });
check("lock needs amount and deliverables", r.status === 400 && /amount/i.test(r.json.error), JSON.stringify(r.json));
r = await rohan.req("POST", `/api/colleges/${iitb.id}/stage`, { to: "locked", fields: { dealAmount: 3000000, dealDeliverables: "Two artists, stage" } });
check("lock with amount and deliverables ok", r.status === 200, JSON.stringify(r.json));
r = await rohan.req("POST", `/api/colleges/${iitb.id}/stage`, { to: "rates_proposed" });
check("exec cannot reopen or move back", r.status === 400, JSON.stringify(r.json));
r = await isha.req("POST", `/api/colleges/${iitb.id}/stage`, { to: "rates_proposed" });
check("admin can move back", r.status === 200, JSON.stringify(r.json));
r = await isha.req("POST", `/api/colleges/${iitb.id}/stage`, { to: "lost" });
check("lost needs a reason", r.status === 400, JSON.stringify(r.json));
r = await isha.req("POST", `/api/colleges/${iitb.id}/stage`, { to: "lost", reason: "Budget gap" });
check("lost with reason ok", r.status === 200);
const d = (await rohan.req("GET", `/api/colleges/${iitb.id}`)).json;
check("stage history recorded", d.log.length === 4 && d.log[0].to === "lost", JSON.stringify(d.log.map((l) => l.to)));

// create / duplicate / assign / import
r = await rohan.req("POST", "/api/colleges", { name: `Test College ${stamp}`, city: "Kolkata", state: "West Bengal", festMonth: 5, days: 3 });
check("exec can add a college", r.status === 200, JSON.stringify(r.json));
const tcId = r.json.id;
check("duplicate college rejected", (await rohan.req("POST", "/api/colleges", { name: `test  college ${stamp}`, city: "KOLKATA", festMonth: 5 })).status === 409);
check("new college auto-assigned to creator", (await rohan.req("GET", `/api/colleges/${tcId}`)).status === 200);
check("exec cannot assign", (await rohan.req("POST", `/api/colleges/${tcId}/assign`, { userIds: [] })).status === 403);
check("admin can assign with pitch company", (await isha.req("POST", `/api/colleges/${tcId}/assign`, { userIds: [3, 4], pitchCompany: "Wave Events LLP" })).status === 200);
check("pitch company saved", (await rohan.req("GET", `/api/colleges/${tcId}`)).json.college.pitchCompany === "Wave Events LLP");
check("assign without pitch keeps it", (await isha.req("POST", `/api/colleges/${tcId}/assign`, { userIds: [3, 4] })).status === 200 && (await rohan.req("GET", `/api/colleges/${tcId}`)).json.college.pitchCompany === "Wave Events LLP");
check("exec cannot import", (await rohan.req("POST", "/api/colleges/import", { csv: "a,b" })).status === 403);
r = await isha.req("POST", "/api/colleges/import", { csv: `College Name,City,State,Month,Days,Fest Type\nJadavpur ${stamp},Kolkata,West Bengal,Feb,3,Cultural\nTest College ${stamp},Kolkata,West Bengal,3,2,Cultural\nBad Row ${stamp},Pune,Maharashtra,notamonth,2,Cultural` });
check("csv import counts", r.json.added === 1 && r.json.duplicates.length === 1 && r.json.notImported.length === 1, JSON.stringify(r.json));

// history
r = await rohan.req("POST", `/api/colleges/${tcId}/history`, { section: "sponsor", data: { brand: "red bull", year: 2025, title: "Title sponsor", amount: 500000, deliverables: "Stall", exclusive: true } });
check("history sponsor joins existing company", r.status === 200);
const companies = (await rohan.req("GET", "/api/companies")).json;
const rb = companies.find((c) => c.name === "Red Bull");
check("no duplicate company created", companies.filter((c) => /red ?bull/i.test(c.name)).length === 1);
check("company aggregates colleges", rb.colleges >= 1 && rb.exclusive === true, JSON.stringify(rb));
r = await rohan.req("POST", `/api/colleges/${tcId}/history`, { section: "artist", data: { year: 2025, artistName: "divine", amount: 1000000, travel: "extra", travelExtra: 100000 } });
check("history artist links roster", r.status === 200);
const det = (await rohan.req("GET", `/api/colleges/${tcId}`)).json;
check("artist entry linked to roster by name", det.artistEntries[0].artistId && det.artistEntries[0].artistName === "Divine", JSON.stringify(det.artistEntries));

// roster privacy
const ra = (await rohan.req("GET", "/api/artists")).json;
check("exec roster hides contacts and rates", ra.every((a) => a.contacts === null && a.lastRate === null));
const ia = (await isha.req("GET", "/api/artists")).json;
check("admin roster shows contacts and rates", ia.every((a) => Array.isArray(a.contacts)) && ia.some((a) => a.lastRate > 0));
const divine = ia.find((a) => a.name === "Divine");
const dd = (await rohan.req("GET", `/api/artists/${divine.id}`)).json;
check("exec artist detail hides fees", dd.contacts === null && dd.history.every((h) => h.amount === null) && dd.artist.lastRate === null);
check("exec cannot edit artists", (await rohan.req("PATCH", `/api/artists/${divine.id}`, { crewCount: 99 })).status === 403);
r = await isha.req("PATCH", `/api/artists/${divine.id}`, { crewCount: 9, techRiderUrl: "drive.google.com/x" });
check("rider link must be a full url", r.status === 400);
r = await isha.req("PATCH", `/api/artists/${divine.id}`, { crewCount: 9, techRiderUrl: "https://drive.google.com/x", contacts: [{ name: "A", designation: "Manager", phone: "98765 43210" }, { name: "B", designation: "Sound", phone: "+44 7700 900123" }] });
check("admin edits artist with multiple contacts", r.status === 200, JSON.stringify(r.json));
const dd2 = (await isha.req("GET", `/api/artists/${divine.id}`)).json;
check("contacts normalised", dd2.contacts.length === 2 && dd2.contacts[0].phone === "919876543210" && dd2.contacts[1].phone === "447700900123", JSON.stringify(dd2.contacts));
r = await isha.req("POST", `/api/artists/${divine.id}/shows`, { collegeName: "Some College", year: 2024, amount: 700000, travel: "extra", travelExtra: 50000 });
check("admin adds manual show", r.status === 200);

// sponsor deals
const deals = (await rohan.req("GET", "/api/deals")).json;
check("exec does not see admin's overall deal", deals.every((x) => x.collegeId !== null || x.createdBy === 3), JSON.stringify(deals.map((x) => [x.id, x.collegeId, x.createdBy])));
r = await rohan.req("POST", "/api/deals", { companyId: rb.id, collegeId: tcId, stage: "locked" });
check("exec deal always starts at reach out", r.status === 200);
const dealId = r.json.id;
r = await rohan.req("POST", `/api/deals/${dealId}/stage`, { to: "proposal_sent" });
check("proposal needs amount", r.status === 400);
r = await rohan.req("POST", `/api/deals/${dealId}/stage`, { to: "proposal_sent", fields: { amount: 400000 } });
check("proposal with amount ok", r.status === 200, JSON.stringify(r.json));
r = await rohan.req("POST", `/api/deals/${dealId}/stage`, { to: "locked", fields: { amount: 400000 } });
check("sponsor lock needs deliverables", r.status === 400);
r = await rohan.req("POST", `/api/deals/${dealId}/stage`, { to: "locked", fields: { amount: 400000, deliverables: "Stage branding" } });
check("sponsor lock ok", r.status === 200);
check("exec cannot move sponsor deal back", (await rohan.req("POST", `/api/deals/${dealId}/stage`, { to: "reach_out" })).status === 400);
check("admin can move sponsor deal back", (await isha.req("POST", `/api/deals/${dealId}/stage`, { to: "reach_out" })).status === 200);
const mdeal = (await rohan.req("GET", `/api/companies/${rb.id}`)).json;
check("company detail has deal log", mdeal.deals.find((x) => x.id === dealId).log.length === 4, JSON.stringify(mdeal.deals.find((x) => x.id === dealId)?.log?.length));
// other exec cannot touch it
const meera = await as("meera");
const own = (await rohan.req("POST", "/api/deals", { companyId: rb.id, collegeId: null })).json.id;
check("other exec cannot move my overall deal", (await meera.req("POST", `/api/deals/${own}/stage`, { to: "initial_connect" })).status === 403);
check("assigned exec can move a college deal", (await meera.req("POST", `/api/deals/${dealId}/stage`, { to: "initial_connect" })).status === 200);

// accounts
check("exec cannot list users", (await rohan.req("GET", "/api/users")).status === 403);
check("admin can list users", (await isha.req("GET", "/api/users")).status === 200);
check("admin cannot create users", (await isha.req("POST", "/api/users", { name: "X", username: "xx1", password: "password123", role: "executive" })).status === 403);
r = await aarav.req("POST", "/api/users", { name: "Temp User", username: `temp.${stamp}`, password: "short" });
check("short password rejected", r.status === 400);
r = await aarav.req("POST", "/api/users", { name: "Temp User", username: `temp.${stamp}`, password: "temp-pass-123", role: "executive" });
check("super admin creates user", r.status === 200, JSON.stringify(r.json));
const tid = r.json.id;
check("duplicate username rejected", (await aarav.req("POST", "/api/users", { name: "T2", username: `TEMP.${stamp}`, password: "temp-pass-123", role: "executive" })).status === 409);
const temp = new Client();
check("new user can sign in", (await temp.login(`temp.${stamp}`, "temp-pass-123")).status === 200);
check("revoke works", (await aarav.req("PATCH", `/api/users/${tid}`, { active: false })).status === 200);
check("revoked session is dead immediately", (await temp.req("GET", "/api/me")).status === 401);
check("revoked user cannot sign in", (await new Client().login(`temp.${stamp}`, "temp-pass-123")).status === 403);
check("restore works", (await aarav.req("PATCH", `/api/users/${tid}`, { active: true })).status === 200);
check("restored user signs in", (await new Client().login(`temp.${stamp}`, "temp-pass-123")).status === 200);
check("cannot revoke self", (await aarav.req("PATCH", "/api/users/1", { active: false })).status === 400);
check("cannot demote last super admin", (await aarav.req("PATCH", "/api/users/1", { role: "admin" })).status === 400);

// home page
const istToday = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const plus = (n) => new Date(Date.parse(istToday + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const rh = (await rohan.req("GET", "/api/home")).json;
check("home: exec sees own queue only", rh.viewing.name === "Rohan Verma" && rh.items.length > 0 && !rh.team, JSON.stringify(rh.viewing));
let mineOk = true;
for (const it of rh.items.filter((i) => i.kind === "college")) if ((await rohan.req("GET", `/api/colleges/${it.id}`)).status !== 200) mineOk = false;
check("home: every college item is assigned to the viewer", mineOk);
check("home: sorted by priority", rh.items.every((it, i, a) => i === 0 || a[i - 1].score >= it.score));
check("home: summary matches items", rh.summary.overdue === rh.items.filter((i) => i.group === "overdue").length && rh.summary.today === rh.items.filter((i) => i.group === "today").length);
check("home: items explain their priority", rh.items.every((i) => Array.isArray(i.reasons) && typeof i.level === "string"));
check("home: closed deals are left out", rh.items.every((i) => !["locked", "lost"].includes(i.stage)));
const ih = (await isha.req("GET", "/api/home")).json;
check("home: admin gets team pulse and pipeline", Array.isArray(ih.team) && !!ih.pipeline && Array.isArray(ih.unassigned));
const ias = (await isha.req("GET", "/api/home?as=3")).json;
check("home: admin can view a teammate's queue", ias.viewing.id === 3 && ias.items.map((i) => i.key).join() === rh.items.map((i) => i.key).join() && !ias.team);
check("home: exec cannot view a teammate", (await rohan.req("GET", "/api/home?as=4")).status === 403);
// snooze changes the due date but does not count as an update
const target = rh.items.find((i) => i.kind === "college");
const before = (await rohan.req("GET", `/api/colleges/${target.id}`)).json.college;
r = await rohan.req("PATCH", `/api/colleges/${target.id}`, { nextActionDue: plus(20) });
const after = (await rohan.req("GET", `/api/colleges/${target.id}`)).json.college;
check("snooze sets the new date", r.status === 200 && after.nextActionDue === plus(20), JSON.stringify(after.nextActionDue));
check("snooze is not counted as an update", after.lastTouchedAt === before.lastTouchedAt);
check("snoozed item moves to Later", (await rohan.req("GET", "/api/home")).json.items.find((i) => i.key === target.key).group === "later");
r = await rohan.req("PATCH", `/api/colleges/${target.id}`, { nextAction: "Custom step", nextActionDue: plus(2) });
check("custom step and date saved", (await rohan.req("GET", `/api/colleges/${target.id}`)).json.college.nextAction === "Custom step");
// stage moves suggest the next due date unless one is given
const sc = (await rohan.req("POST", "/api/colleges", { name: `Home Test ${stamp}`, city: "Pune", festMonth: 7 })).json.id;
check("new college gets a reach-out due date", (await rohan.req("GET", `/api/colleges/${sc}`)).json.college.nextActionDue === plus(3));
await rohan.req("POST", `/api/colleges/${sc}/stage`, { to: "initial_connect" });
const sc1 = (await rohan.req("GET", `/api/colleges/${sc}`)).json.college;
check("stage move suggests the next due date", sc1.nextActionDue === plus(7) && sc1.nextAction === "", JSON.stringify([sc1.nextActionDue, plus(7)]));
await rohan.req("POST", `/api/colleges/${sc}/stage`, { to: "requirements_received", fields: { nextAction: "Get budget", nextActionDue: plus(1) } });
const sc2 = (await rohan.req("GET", `/api/colleges/${sc}`)).json.college;
check("stage move keeps a custom next step", sc2.nextAction === "Get budget" && sc2.nextActionDue === plus(1));
await isha.req("POST", `/api/colleges/${sc}/stage`, { to: "lost", reason: "Budget gap" });
const sc3 = (await rohan.req("GET", `/api/colleges/${sc}`)).json.college;
check("closing a deal clears its next step", sc3.nextAction === "" && sc3.nextActionDue === null);
const nd = (await rohan.req("POST", "/api/deals", { companyId: rb.id, collegeId: null })).json.id;
check("new sponsor deal gets a due date", (await rohan.req("GET", "/api/deals")).json.find((x) => x.id === nd).nextActionDue === plus(3));
r = await rohan.req("POST", `/api/deals/${nd}/stage`, { to: "initial_connect", fields: { nextAction: "Call back", nextActionDue: plus(4) } });
check("deal stage move saves next step", r.status === 200 && (await rohan.req("GET", "/api/deals")).json.find((x) => x.id === nd).nextAction === "Call back");

// csrf
r = await rohan.req("POST", `/api/colleges/${tcId}/notes`, { text: "hi" }, { origin: "https://evil.example" });
check("cross-site write blocked", r.status === 403);
check("note saved", (await rohan.req("POST", `/api/colleges/${tcId}/notes`, { text: "Spoke to convenor" })).status === 200);

// alerts
const al = (await rohan.req("GET", "/api/alerts")).json;
check("alerts endpoint works", Array.isArray(al));

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
