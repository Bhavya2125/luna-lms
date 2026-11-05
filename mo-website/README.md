# Mo Entertainments website (concept)

Static site, no build step. Same structure as `lunawave-website/`, with a sunset-city theme.

| Page | What it is |
| --- | --- |
| `index.html` | Home: animated sunset hero, recent shows, services, campuses, process, Instagram |
| `artists.html` | Artist roster with search, filters and a shortlist that feeds the enquiry form |
| `enquire.html` | 6-step booking form with a live brief card |
| `leads.html` | Team inbox demo: leads from the form appear here instantly (same browser) |
| `logos.html` | Logo redrawn as SVG, colour versions and palette |

Run locally: `python -m http.server 5179 -d mo-website`, or deploy the folder on Vercel (Root Directory `mo-website`, Framework "Other").

## Before going live
1. Contact details live in `config.js` (WhatsApp +91 70195 34038, moentertainment.enquiry@gmail.com).
   Empty values are hidden on the site.
2. In Vercel (Root Directory: the repo root in Bhavya2125/mo, or `mo-website` if deploying from luna-lms),
   add these environment variables so briefs are emailed (see `api/enquiry.js`):
   - `RESEND_API_KEY`: from resend.com (free tier is plenty)
   - `LEADS_TO`: `moentertainment.enquiry@gmail.com` (comma-separate for several)
   - `LEADS_FROM`: `Mo Bookings <onboarding@resend.dev>` works only if the Resend account was signed up
     with that same Gmail address (Resend's test sender only delivers to the account owner). For any other
     inbox, verify a domain in Resend and use e.g. `Mo Bookings <briefs@yourdomain.in>`.
3. Once the domain is known, make the link-preview tags in `index.html` absolute
   (`og:image` → `https://<domain>/img/og.jpg`, and add `og:url`), or WhatsApp shows no image.

## How booking requests reach the team
The last step of `enquire.html` POSTs the brief to `/api/enquiry`, which emails it to `LEADS_TO`
(reply-to is the visitor, so hitting Reply answers them). The visitor sees "Brief received" plus an
"Also send on WhatsApp" button. If the email can't be sent (env vars missing, Resend down, or running
locally with `python -m http.server`, which has no `/api`), the form falls back to WhatsApp with the
brief written out, then an Instagram DM. Set `enquiryEndpoint: ""` in `config.js` to use WhatsApp only.
A hidden `website` field catches spam bots. `leads.html` only shows requests sent from the same
browser, so it is a local log, not a team inbox.

## Photos
Show and artist posters are from @mo__entertainments and partner fest posts (Parsec, Sonabyss,
Vivante, BMSET Hostels); confirm use with those fests. `band-beams.jpg`, `closing.jpg` and `svc-*.jpg`
are Unsplash stock. `og.jpg` is the hero, used for link previews.

## Artists
`artists.js` is generated from `data/artists.json` (the same list the app roster uses):
`node mo-website/sync-artists.mjs`. Mo's own acts and their posters are in `featured.js`.
