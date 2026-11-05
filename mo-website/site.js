// Shared bits for the Mo Entertainments concept pages: logo, nav, lead store.

// Logo traced from the original artwork (1600px square): an M whose right
// stem becomes a ring around a dot, with a red segment at the top right.
// White/ink parts use currentColor; the segment uses --mo-accent.
const MO_PATHS = `
  <path d="M345 440H452L573 675L710 440H812V706H722V598L570 860L433 600V925A44 44 0 0 1 345 925Z"/>
  <path d="M722 697A273 273 0 1 0 1236 569L1156.6 611.1A183 183 0 1 1 812 697Z"/>
  <circle cx="995" cy="697" r="78"/>
  <path fill="var(--mo-accent,#C21D3F)" d="M1056.4 431A273 273 0 0 1 1181.2 497.4L1119.8 563.2A183 183 0 0 0 1036.2 518.7Z"/>`;

function moMark() {
  return `<svg class="mo-mark" viewBox="330 415 960 570" role="img" aria-label="Mo Entertainments"><g fill="currentColor">${MO_PATHS}</g></svg>`;
}
// Full lockup: mark over the wordmark, as on the original
function moLogo() {
  return `<svg class="mo-logo" viewBox="140 400 1320 760" role="img" aria-label="Mo Entertainments"><g fill="currentColor">${MO_PATHS}
    <text x="800" y="1122" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="700" font-size="128" letter-spacing="2">Mo Entertainments</text></g></svg>`;
}
// Header lockup: mark beside a spaced wordmark
function moCompact() {
  return `<svg class="mo-logo mo-compact" viewBox="0 0 300 52" role="img" aria-label="Mo Entertainments">
    <svg x="0" y="2" width="84" height="48" viewBox="330 415 960 570"><g fill="currentColor">${MO_PATHS}</g></svg>
    <text x="96" y="25" font-family="Montserrat, sans-serif" font-weight="800" font-size="17" letter-spacing="3.2" fill="currentColor">MO</text>
    <text x="96" y="44" font-family="Montserrat, sans-serif" font-weight="600" font-size="11.5" letter-spacing="3.4" fill="currentColor" opacity=".75">ENTERTAINMENTS</text>
  </svg>`;
}

document.querySelectorAll("[data-logo]").forEach(el => {
  const v = el.dataset.logo;
  el.innerHTML = v === "mark" ? moMark() : v === "compact" ? moCompact() : moLogo();
});

// Contact links from config.js: <a data-contact="whatsapp|phone|email|instagram">.
// Empty values hide the link (and its <li>), so nothing broken ever shows.
const MO = Object.assign({ whatsapp: "", phone: "", email: "", instagram: "mo__entertainments" }, window.MO_CONTACT);
const moWhatsApp = text => MO.whatsapp ? `https://wa.me/${MO.whatsapp.replace(/\D/g, "")}${text ? "?text=" + encodeURIComponent(text) : ""}` : "";
window.moWhatsApp = moWhatsApp; window.MO = MO;
document.querySelectorAll("[data-contact]").forEach(a => {
  const k = a.dataset.contact;
  const href = { whatsapp: moWhatsApp(""), phone: MO.phone && "tel:" + MO.phone.replace(/[^\d+]/g, ""), email: MO.email && "mailto:" + MO.email, instagram: MO.instagram && "https://www.instagram.com/" + MO.instagram + "/" }[k];
  if (!href) { (a.closest("li") || a).remove(); return; }
  a.href = href;
  if (a.dataset.show === "value") a.textContent = k === "phone" ? MO.phone : k === "email" ? MO.email : a.textContent;
  if (k !== "phone" && k !== "email") { a.target = "_blank"; a.rel = "noopener"; }
});

// Mobile menu
const menuBtn = document.querySelector(".menu-btn");
if (menuBtn) menuBtn.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  menuBtn.setAttribute("aria-expanded", open);
  menuBtn.textContent = open ? "Close" : "Menu";
});
document.querySelectorAll(".nav a").forEach(a => a.addEventListener("click", () => {
  if (!document.body.classList.contains("nav-open")) return;
  document.body.classList.remove("nav-open"); menuBtn.textContent = "Menu"; menuBtn.setAttribute("aria-expanded", false);
}));

// Stats count up from zero when they scroll into view ("150+", "48h" keep their suffix)
const counters = document.querySelectorAll(".meta b");
if (counters.length && !matchMedia("(prefers-reduced-motion:reduce)").matches && "IntersectionObserver" in window) {
  const run = el => {
    const [, num, suf] = el.textContent.match(/^(\d+)(.*)$/) || [];
    if (!num) return;
    const end = +num, t0 = performance.now(), T = 1800;
    (function tick(now) {
      const p = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(e * end) + suf;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  };
  const co = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); co.unobserve(e.target); } }), { threshold: .6 });
  counters.forEach(el => { el.dataset.final = el.textContent; co.observe(el); });
}

// Scroll reveal
const io = "IntersectionObserver" in window && new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: .12 });
document.querySelectorAll(".reveal").forEach(el => io ? io.observe(el) : el.classList.add("in"));

// Lead store. In this concept, leads live in the browser and reach the inbox
// tab instantly over BroadcastChannel. In production this becomes a POST to
// the server plus a realtime push (see README.md).
const LeadStore = {
  key: "mo-leads",
  channel: "BroadcastChannel" in window ? new BroadcastChannel("mo-leads") : null,
  all() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } },
  save(list) { try { localStorage.setItem(this.key, JSON.stringify(list)); } catch {} },
  add(lead) {
    lead.id = "MO-" + Date.now().toString(36).toUpperCase();
    lead.at = new Date().toISOString();
    lead.status = "new";
    const list = this.all(); list.unshift(lead); this.save(list);
    this.channel && this.channel.postMessage({ type: "lead", lead });
    return lead;
  },
  update(id, patch) {
    const list = this.all().map(l => l.id === id ? { ...l, ...patch } : l);
    this.save(list);
    this.channel && this.channel.postMessage({ type: "update" });
  }
};
window.LeadStore = LeadStore;

// Favicon: white mark on the night colour
const fav = document.createElement("link");
fav.rel = "icon";
fav.href = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#0D0716"/><svg x="10" y="22" width="80" height="56" viewBox="330 415 960 570"><g fill="#fff">${MO_PATHS.replace("var(--mo-accent,#C21D3F)", "#D94B7B")}</g></svg></svg>`);
document.head.appendChild(fav);

// Header turns solid once the hero is behind it; statement words light up
const header = document.querySelector(".top");
const onScroll = () => {
  if (header) header.classList.toggle("solid", scrollY > 40);
  document.querySelectorAll(".statement .w").forEach(w => w.classList.toggle("on", w.getBoundingClientRect().top < innerHeight * .62));
};
document.querySelectorAll(".statement p").forEach(p => {
  p.innerHTML = p.innerHTML.split(/(<em[^>]*>.*?<\/em>|\s+)/).map(t => !t.trim() ? t : `<span class="w">${t}</span>`).join("");
});
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Cursor ring that grows over links and buttons
if (matchMedia("(pointer:fine)").matches && !matchMedia("(prefers-reduced-motion:reduce)").matches) {
  const c = document.createElement("div"); c.className = "cursor"; document.body.appendChild(c);
  let x = -100, y = -100, cx = x, cy = y;
  addEventListener("pointermove", e => { x = e.clientX; y = e.clientY; });
  document.addEventListener("pointerover", e => c.classList.toggle("big", !!e.target.closest("a,button,select")));
  (function loop() { cx += (x - cx) * .2; cy += (y - cy) * .2; c.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); })();
}

// Services list: the row's photo floats with the cursor
const preview = document.querySelector(".svc-preview");
if (preview) {
  let px = 0, py = 0, tx = 0, ty = 0;
  document.querySelectorAll(".index a[data-img]").forEach(a => {
    new Image().src = a.dataset.img;
    a.addEventListener("pointerenter", () => { preview.src = a.dataset.img; preview.classList.add("on"); });
    a.addEventListener("pointerleave", () => preview.classList.remove("on"));
  });
  addEventListener("pointermove", e => { tx = e.clientX + 170; ty = e.clientY; });
  (function follow() { px += (tx - px) * .14; py += (ty - py) * .14; preview.style.left = px + "px"; preview.style.top = py + "px"; requestAnimationFrame(follow); })();
}

// Slow parallax on the full-width photo
const band = document.querySelector(".photo-band img");
if (band && !matchMedia("(prefers-reduced-motion:reduce)").matches) addEventListener("scroll", () => {
  const r = band.parentElement.getBoundingClientRect();
  if (r.bottom > 0 && r.top < innerHeight) band.style.transform = `translateY(${(r.top / innerHeight) * -60}px)`;
}, { passive: true });
