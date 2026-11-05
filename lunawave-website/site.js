// Shared bits for the Luna Wave concept pages: logo, nav, lead store.

// Logo geometry, traced from the original artwork: a ring with the wordmark
// starting inside it and running out past the right edge. The ring breaks
// cleanly around the letters instead of running through them.
const LW_RING = { cx: 130, cy: 120, r: 100 };
const LW_TEXT = { x: 90, y: 130, size: 27, len: 202 };

function lwText(attrs = "") {
  return `<text x="${LW_TEXT.x}" y="${LW_TEXT.y}" font-family="Michroma, 'Eurostile', sans-serif" font-size="${LW_TEXT.size}" textLength="${LW_TEXT.len}" lengthAdjust="spacingAndGlyphs" ${attrs}>LUNA WAVE</text>`;
}

let lwId = 0;
// variant: "ring" (Bold Ring, the chosen logo), "eclipse" (ring plus
// a lit crescent), "disc" (solid moon, wordmark inverts where it crosses).
function lwLogo(variant = "ring", stroke = 7) {
  const id = "lw" + ++lwId;
  const { cx, cy, r } = LW_RING;
  const knock = `<mask id="${id}k"><rect x="0" y="0" width="320" height="240" fill="#fff"/>${lwText(`fill="#000" stroke="#000" stroke-width="12" stroke-linejoin="round"`)}</mask>`;
  if (variant === "disc") {
    return `<svg class="lw-logo" viewBox="22 12 278 216" role="img" aria-label="Luna Wave">
      <defs><clipPath id="${id}c"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
      <mask id="${id}o"><rect width="320" height="240" fill="#fff"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#000"/></mask></defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor"/>
      <g clip-path="url(#${id}c)" fill="var(--logo-cut,#000)">${lwText()}</g>
      <g mask="url(#${id}o)" fill="currentColor">${lwText()}</g>
    </svg>`;
  }
  const crescent = variant === "eclipse"
    ? `<path d="M${cx} ${cy - r + 4} A${r - 4} ${r - 4} 0 0 1 ${cx} ${cy + r - 4} A${r * 0.62} ${r - 4} 0 0 0 ${cx} ${cy - r + 4}Z" fill="currentColor" mask="url(#${id}k)"/>`
    : "";
  return `<svg class="lw-logo" viewBox="22 12 278 216" role="img" aria-label="Luna Wave">
    <defs>${knock}</defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-width="${stroke}" mask="url(#${id}k)"/>
    ${crescent}
    <g fill="currentColor">${lwText()}</g>
  </svg>`;
}

// Square app icon / favicon: the ring alone with a small wave through it.
function lwMark() {
  return `<svg class="lw-mark" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="8"/>
    <path d="M6 54c10 0 10-10 20-10s10 10 20 10 10-10 20-10 10 10 20 10 6-4 8-6" fill="none" stroke="var(--logo-cut,#000)" stroke-width="14" stroke-linecap="round"/>
    <path d="M6 54c10 0 10-10 20-10s10 10 20 10 10-10 20-10 10 10 20 10 6-4 8-6" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
  </svg>`;
}

// Compact lockup for headers: the full logo's wordmark is too small to read
// below ~120px tall, so the ring shrinks and the wordmark grows.
function lwCompact() {
  const id = "lw" + ++lwId;
  const t = a => `<text x="17" y="32" font-family="Michroma, sans-serif" font-size="17" textLength="150" lengthAdjust="spacingAndGlyphs" ${a}>LUNA WAVE</text>`;
  return `<svg class="lw-logo lw-compact" viewBox="0 0 172 48" role="img" aria-label="Luna Wave">
    <defs><mask id="${id}k"><rect width="172" height="48" fill="#fff"/>${t(`fill="#000" stroke="#000" stroke-width="7"`)}</mask></defs>
    <circle cx="24" cy="24" r="20.5" fill="none" stroke="currentColor" stroke-width="3.5" mask="url(#${id}k)"/>
    <g fill="currentColor">${t("")}</g>
  </svg>`;
}

document.querySelectorAll("[data-logo]").forEach(el => {
  const v = el.dataset.logo;
  el.innerHTML = v === "mark" ? lwMark() : v === "compact" ? lwCompact() : lwLogo(v || "ring", +(el.dataset.stroke || 7));
});

// Mobile menu
const menuBtn = document.querySelector(".menu-btn");
if (menuBtn) menuBtn.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  menuBtn.setAttribute("aria-expanded", open);
  menuBtn.textContent = open ? "Close" : "Menu";
});

// Scroll reveal
const io = "IntersectionObserver" in window && new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: .12 });
document.querySelectorAll(".reveal").forEach(el => io ? io.observe(el) : el.classList.add("in"));

// Lead store. In this concept, leads live in the browser and reach the inbox
// tab instantly over BroadcastChannel. In production this becomes a POST to
// the server plus a realtime push (see README.md).
const LeadStore = {
  key: "lw-leads",
  channel: "BroadcastChannel" in window ? new BroadcastChannel("lw-leads") : null,
  all() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } },
  save(list) { try { localStorage.setItem(this.key, JSON.stringify(list)); } catch {} },
  add(lead) {
    lead.id = "LW-" + Date.now().toString(36).toUpperCase();
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

// Favicon from the Full Moon mark
const fav = document.createElement("link");
fav.rel = "icon";
fav.href = "data:image/svg+xml," + encodeURIComponent(lwMark().replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" style="color:#fff" ').replace("var(--logo-cut,#000)", "#06070A").replace(/currentColor/g, "#fff"));
document.head.appendChild(fav);

// Header turns solid once the hero is behind it
const header = document.querySelector(".top");
const onScroll = () => {
  if (header) header.classList.toggle("solid", scrollY > 40);
  // Statement words light up as they pass the middle of the screen
  document.querySelectorAll(".statement .w").forEach(w => w.classList.toggle("on", w.getBoundingClientRect().top < innerHeight * .62));
  // Closing ring draws itself as you scroll into it
  const ring = document.querySelector(".closing .ring");
  if (ring) {
    const r = ring.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height * .4)));
    ring.style.setProperty("--p", (p * 100).toFixed(1) + "%");
  }
};
document.querySelectorAll(".statement p").forEach(p => {
  p.innerHTML = p.innerHTML.split(/(<em[^>]*>.*?<\/em>|\s+)/).map(t => !t.trim() ? t : `<span class="w">${t}</span>`).join("");
});
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Ring cursor that grows over links and buttons
if (matchMedia("(pointer:fine)").matches && !matchMedia("(prefers-reduced-motion:reduce)").matches) {
  const c = document.createElement("div"); c.className = "cursor"; document.body.appendChild(c);
  let x = -100, y = -100, cx = x, cy = y;
  addEventListener("pointermove", e => { x = e.clientX; y = e.clientY; });
  document.addEventListener("pointerover", e => c.classList.toggle("big", !!e.target.closest("a,button,select,.rail")));
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
