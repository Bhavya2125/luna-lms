// Vercel serverless function: POST /api/enquiry
// Emails each booking brief from enquire.html to the Mo team through Resend (resend.com).
//
// Set these in Vercel → Project → Settings → Environment Variables:
//   RESEND_API_KEY  your Resend API key
//   LEADS_TO        where briefs go, e.g. "moentertainment.enquiry@gmail.com" (comma-separate for several)
//   LEADS_FROM      a sender on a domain verified in Resend, e.g. "Mo Bookings <briefs@moentertainments.in>"
//                   (until a domain is verified, "Mo Bookings <onboarding@resend.dev>" works,
//                   but Resend then only delivers to the email you signed up with)
// The recipient is never taken from the request, so the form can't be used to email anyone else.

const MAX = 2000; // longest value we accept per field

const clean = v => (Array.isArray(v) ? v.map(clean).filter(Boolean).join(", ") : String(v ?? "").trim().slice(0, MAX));
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const FIELDS = [
  ["Reference", "id"], ["Event", "type"], ["Name", "name"], ["Organisation", "org"], ["Role", "role"],
  ["Date", "date"], ["Flexible date", "flexible"], ["City", "city"], ["Venue", "venue"],
  ["Crowd", "crowd"], ["Budget", "budget"], ["Needs", "needs"], ["Vibe", "vibe"], ["Artists", "artists"],
  ["Phone", "phone"], ["Email", "email"], ["Updates on WhatsApp", "whatsapp"], ["Notes", "notes"],
];

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ ok: false, error: "POST only" }); }

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== "object") return res.status(400).json({ ok: false, error: "Bad request" });

  // Spam trap: a field people never see. Bots fill it; pretend it worked.
  if (clean(b.website)) return res.status(200).json({ ok: true });

  const lead = Object.fromEntries(FIELDS.map(([, k]) => [k, typeof b[k] === "boolean" ? (b[k] ? "Yes" : "No") : clean(b[k])]));
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
  if (!lead.type || !lead.phone || !emailOk) return res.status(422).json({ ok: false, error: "Event type, phone and a valid email are needed" });

  const { RESEND_API_KEY, LEADS_TO, LEADS_FROM } = process.env;
  if (!RESEND_API_KEY || !LEADS_TO || !LEADS_FROM) {
    console.error("enquiry: RESEND_API_KEY, LEADS_TO and LEADS_FROM must be set");
    return res.status(503).json({ ok: false, error: "Email delivery isn't set up yet" });
  }

  // The form sends every answer labelled in its own flow's words (they differ per event type);
  // older clients only send the fixed fields.
  const rows = Array.isArray(b.answers)
    ? [["Reference", lead.id], ...b.answers.slice(0, 40).filter(a => Array.isArray(a) && a.length === 2).map(([l, v]) => [clean(l).slice(0, 60), clean(v)])].filter(([l, v]) => l && v)
    : FIELDS.filter(([, k]) => lead[k]).map(([label, k]) => [label, lead[k]]);
  const subject = `${lead.type === "Artist management" ? "New artist" : "New brief"}: ${lead.type}${lead.org ? " · " + lead.org : ""}${lead.date ? " · " + lead.date : ""}${lead.id ? " (" + lead.id + ")" : ""}`;
  const text = rows.map(([label, v]) => `${label}: ${v}`).join("\n");
  const wa = lead.phone.replace(/\D/g, "");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1b1424;max-width:560px">
<h2 style="margin:0 0 4px">New ${lead.type === "Artist management" ? "artist application" : "booking brief"}</h2>
<p style="margin:0 0 16px;color:#6b6475">From the website enquiry form. Reply to this email to answer ${esc(lead.name || "them")} directly.</p>
<table cellpadding="8" style="border-collapse:collapse;width:100%">${rows.map(([label, v]) =>
    `<tr><td style="border-bottom:1px solid #eee;color:#6b6475;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="border-bottom:1px solid #eee"><b>${esc(v).replace(/\n/g, "<br>")}</b></td></tr>`).join("")}</table>
${wa ? `<p style="margin:20px 0 0"><a href="https://wa.me/${wa}" style="background:#25D366;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">WhatsApp ${esc(lead.name || "them")}</a></p>` : ""}
</div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: LEADS_FROM, to: LEADS_TO.split(",").map(s => s.trim()).filter(Boolean), reply_to: lead.email, subject, text, html }),
    });
    if (!r.ok) { console.error("enquiry: Resend said", r.status, await r.text()); return res.status(502).json({ ok: false, error: "Couldn't send the email" }); }
    return res.status(200).json({ ok: true, id: lead.id });
  } catch (e) {
    console.error("enquiry:", e);
    return res.status(502).json({ ok: false, error: "Couldn't send the email" });
  }
};
