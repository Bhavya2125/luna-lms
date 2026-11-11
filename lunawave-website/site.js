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

// Contact links from config.js: <a data-contact="whatsapp|phone|email|instagram">.
// Empty values hide the link (and its <li>), so nothing broken ever shows.
const LW = Object.assign({ whatsapp: "918296533233", phone: "+91 82965 33233", email: "", instagram: "luna.wave_ind", enquiryEndpoint: "" }, window.LW_CONTACT);
const lwWhatsApp = text => LW.whatsapp ? `https://wa.me/${LW.whatsapp.replace(/\D/g, "")}${text ? "?text=" + encodeURIComponent(text) : ""}` : "";
window.lwWhatsApp = lwWhatsApp; window.LW = LW;
document.querySelectorAll("[data-contact]").forEach(a => {
  const k = a.dataset.contact;
  const href = { whatsapp: lwWhatsApp(""), phone: LW.phone && "tel:" + LW.phone.replace(/[^\d+]/g, ""), email: LW.email && "mailto:" + LW.email, instagram: LW.instagram && "https://www.instagram.com/" + LW.instagram + "/" }[k];
  if (!href) { (a.closest("li,.c-line") || a).remove(); return; }
  a.href = href;
  if (a.dataset.show === "value") a.textContent = k === "phone" ? LW.phone : k === "email" ? LW.email : a.textContent;
  if (k !== "phone" && k !== "email") { a.target = "_blank"; a.rel = "noopener"; }
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
fav.href = "data:image/svg+xml," + encodeURIComponent(lwMark().replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" style="color:#fff" ').replace("var(--logo-cut,#000)", "#060418").replace(/currentColor/g, "#fff"));
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

// Deep-space background on every page: three layers of stars that drift at
// different speeds as you scroll (parallax), lean towards the pointer, twinkle,
// and now and then a shooting star crosses. Still image for reduced motion.
(() => {
  const c = document.createElement("canvas"); c.id = "cosmos"; c.setAttribute("aria-hidden", "true");
  document.body.prepend(c);
  const ctx = c.getContext("2d"), still = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const TINTS = ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#E2DAFF", "#D6E4FF"];
  let W, H, stars = [], px = 0, py = 0, tx = 0, ty = 0, shoots = [], nextShoot = 3500;
  const TRAILS = [[255, 79, 184], [164, 123, 255], [47, 123, 255], [31, 242, 216]];
  function size() {
    const d = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight; c.width = W * d; c.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    const n = Math.round(W * H / 11000);
    stars = Array.from({ length: n }, () => {
      const z = Math.random() ** 2.2; // most stars far away, a few close
      return { x: Math.random() * W, y: Math.random() * H, z, r: .35 + z * 1.1, p: Math.random() * 6.3, s: .4 + Math.random() * 1.6, c: TINTS[Math.random() * TINTS.length | 0] };
    });
  }
  addEventListener("resize", size); size();
  addEventListener("pointermove", e => { tx = (e.clientX / W - .5); ty = (e.clientY / H - .5); }, { passive: true });
  function frame(t) {
    px += (tx - px) * .04; py += (ty - py) * .04;
    const sy = scrollY;
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      const depth = .03 + s.z * .22;
      let y = (s.y - sy * depth) % H; if (y < 0) y += H;
      const x = s.x - px * 30 * (s.z + .1);
      const tw = still ? .8 : .45 + .55 * Math.sin(t * .001 * s.s + s.p) ** 2;
      ctx.globalAlpha = (.22 + s.z * .5) * tw;
      ctx.fillStyle = s.c;
      if (s.r > 1.3) { ctx.beginPath(); ctx.arc(x, y - py * 20 * s.z, s.r * .7, 0, 6.29); ctx.fill(); }
      else ctx.fillRect(x, y - py * 20 * s.z, s.r, s.r);
    }
    if (!still) {
      // shooting stars: a new one every 0.8–2.6 s, up to four at once, each with a coloured tail
      if (t > nextShoot && shoots.length < 1) {
        const fromLeft = Math.random() < .5, fast = 8 + Math.random() * 9;
        shoots.push({ x: fromLeft ? Math.random() * W * .6 : W * (.4 + Math.random() * .6), y: Math.random() * H * .55,
          vx: (fromLeft ? 1 : -1) * fast, vy: fast * (.25 + Math.random() * .35), life: 0, max: 45 + Math.random() * 40,
          len: 9 + Math.random() * 8, w: .8 + Math.random() * .5, c: [226, 220, 255] });
        nextShoot = t + 6000 + Math.random() * 7000;
      }
      for (const sh of shoots) {
        sh.life++; sh.x += sh.vx; sh.y += sh.vy;
        const [r, g2, b2] = sh.c, ex = sh.x - sh.vx * sh.len, ey = sh.y - sh.vy * sh.len;
        const g = ctx.createLinearGradient(sh.x, sh.y, ex, ey);
        g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.18, `rgba(${r},${g2},${b2},.45)`); g.addColorStop(1, `rgba(${r},${g2},${b2},0)`);
        ctx.globalAlpha = Math.min(1, sh.life / 6, (sh.max - sh.life) / 15);
        ctx.strokeStyle = g; ctx.lineWidth = sh.w; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.w * 1.1, 0, 6.29); ctx.fill();
      }
      shoots = shoots.filter(sh => sh.life < sh.max);
      requestAnimationFrame(frame);
    }
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(frame);
})();

// Footer: a galaxy in the middle of being made. Dust falls in from a loose cloud,
// gets pulled into spiral arms and settles into orbit around a warm core, while a
// small ringed planet watches from the foreground. Calm, not flashy.
(() => {
  const foot = document.querySelector("footer"); if (!foot) return;
  const box = document.createElement("div"); box.className = "genesis";
  box.innerHTML = '<canvas aria-hidden="true"></canvas><div class="copy wrap"><p>We create what you can\'t even <em class="glow">imagine.</em></p><small>Every show starts as loose ideas. We pull them together until they shine.</small></div>';
  foot.prepend(box);
  const c = box.querySelector("canvas"), ctx = c.getContext("2d"), still = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const ARMS = 3, TINT = [[232, 222, 255], [190, 205, 255], [255, 236, 214], [196, 168, 255], [160, 240, 230], [255, 190, 225]];
  let W, H, gx, gy, R, parts = [], run = false, t0 = 0;
  function make(p, fresh) {
    const arm = Math.random() * ARMS | 0, r = Math.pow(Math.random(), .7);
    p.r = r; p.th = arm / ARMS * 6.283 + r * 5.2 + (Math.random() - .5) * (.55 + .5 * (1 - r));
    p.wob = (Math.random() - .5) * .08; p.sz = Math.random() < .04 ? 1.8 : .5 + Math.random() * .9;
    p.c = r < .18 ? TINT[2] : TINT[Math.random() * TINT.length | 0];
    // where the dust starts: somewhere in a wide, loose cloud
    const a = Math.random() * 6.283, d = 1.1 + Math.random() * 1.2;
    p.sx = Math.cos(a) * d; p.sy = Math.sin(a) * d * .8; p.k = fresh ? Math.random() : 0; p.rate = .0015 + Math.random() * .004;
    return p;
  }
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = W > 760; gx = wide ? W * .64 : W * .5; gy = wide ? H * .46 : H * .36; R = Math.min(wide ? W * .3 : W * .46, H * .62);
    parts = Array.from({ length: Math.round(Math.min(2600, W * 1.6)) }, () => make({}, true));
  }
  function planet(t) {
    const px = W > 760 ? W * .9 : W * .84, py = H * (W > 760 ? .74 : .62), pr = Math.max(26, Math.min(W, H) * .07);
    ctx.save(); ctx.translate(px, py); ctx.rotate(-.35);
    const ring = (front) => { ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.9, pr * .42, 0, front ? 0 : Math.PI, front ? Math.PI : 6.283); ctx.strokeStyle = "rgba(205,190,255,.55)"; ctx.lineWidth = 1.2; ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.6, pr * .34, 0, front ? 0 : Math.PI, front ? Math.PI : 6.283); ctx.strokeStyle = "rgba(160,200,255,.3)"; ctx.stroke(); };
    ring(false);
    const g = ctx.createLinearGradient(-pr, -pr, pr, pr); g.addColorStop(0, "#5B4BB0"); g.addColorStop(.45, "#231A5A"); g.addColorStop(1, "#0B0826");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, pr, 0, 6.283); ctx.fill();
    ctx.save(); ctx.clip(); ctx.globalAlpha = .18;
    for (let i = -3; i <= 3; i++) { ctx.fillStyle = i % 2 ? "#C9B8FF" : "#7FA8FF"; ctx.fillRect(-pr, i * pr * .26 + Math.sin(t * .0003 + i) * 2, pr * 2, pr * .1); }
    ctx.restore();
    ctx.strokeStyle = "rgba(225,215,255,.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, pr, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
    ring(true);
    ctx.restore();
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    // faint dust lane / nebula the galaxy is condensing from
    const n = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * 1.8);
    n.addColorStop(0, "rgba(138,77,255,.16)"); n.addColorStop(.5, "rgba(47,123,255,.06)"); n.addColorStop(1, "rgba(6,4,24,0)");
    ctx.fillStyle = n; ctx.fillRect(0, 0, W, H);
    const tilt = .42, rot = -.38, cr = Math.cos(rot), sr = Math.sin(rot), time = still ? 0 : t * .00012;
    for (const p of parts) {
      if (!still) { p.k = Math.min(1, p.k + p.rate); if (p.k >= 1 && Math.random() < .0012) make(p, false); }
      const k = still ? 1 : p.k, e = 1 - Math.pow(1 - k, 3);
      const th = p.th + time / (p.r * 1.4 + .25) + p.wob * Math.sin(t * .001 + p.r * 9);
      // orbit position (in a flat disc), then blend from the starting cloud
      const ox = Math.cos(th) * p.r, oy = Math.sin(th) * p.r;
      const x = p.sx + (ox - p.sx) * e, y = p.sy + (oy - p.sy) * e;
      const dx = x * R, dy = y * R * tilt, X = gx + dx * cr - dy * sr, Y = gy + dx * sr + dy * cr;
      const [r, g, b] = p.c;
      ctx.fillStyle = `rgba(${r},${g},${b},${(.25 + .75 * e) * (p.r < .2 ? .95 : .7)})`;
      ctx.fillRect(X, Y, p.sz, p.sz);
    }
    // warm core, kept small
    const core = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * .2);
    core.addColorStop(0, "rgba(255,244,228,.9)"); core.addColorStop(.35, "rgba(255,214,190,.3)"); core.addColorStop(1, "rgba(255,200,180,0)");
    ctx.fillStyle = core; ctx.beginPath(); ctx.ellipse(gx, gy, R * .2, R * .2 * .7, rot, 0, 6.283); ctx.fill();
    planet(t);
    if (run && !still) requestAnimationFrame(draw);
  }
  addEventListener("resize", () => { size(); if (still) draw(0); }); size();
  if (still) { draw(0); return; }
  new IntersectionObserver(([e]) => { const was = run; run = e.isIntersecting; if (run && !was) requestAnimationFrame(draw); }).observe(box);
})();
