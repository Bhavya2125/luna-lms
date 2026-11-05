# Luna Wave website: concept

Static concept pages. Open `index.html` in a browser; no build step.

| Page | What it shows |
| --- | --- |
| `index.html` | Home: hero, services, recent shows, artists, process, Instagram, CTA |
| `logos.html` | Logo refresh: A Bold Ring (recommended), B Eclipse, C Full Moon, plus app icon |
| `enquire.html` | 6-step enquiry with a live brief card; deep-links via `?type=college\|concert\|corporate\|private\|brand\|artist` |
| `leads.html` | Team inbox that receives new enquiries in real time |

## Placeholders to replace before launch
- Stats (120+ shows, 60+ campuses, 15 cities), testimonials, show posters (swap gradient posters for real photos).
- Instagram tiles link to the profile. For a live feed, use an embed service (Behold, Elfsight) or the Instagram Graph API with a Business account.

## Real-time leads in production
The concept passes leads between browser tabs (`BroadcastChannel`), so it only works on one machine.
For the real site: the form POSTs to an API route that stores the lead in Postgres (this repo already uses Drizzle),
then pushes it to the team via a realtime channel (Supabase Realtime, Pusher or Ably) and web push,
plus an optional WhatsApp/Telegram alert to the founders' phones.

## Photos (`img/`)
- From @luna.wave_ind posts (640px Instagram previews; swap for the original files for sharper cards):
  esplendida-stage, esplendida-crowd, vivante, joel-jazz, staccato, post-shailzii, post-young-broke, post-staccato.
  Several were posted by the event accounts (ESPLENDIDA 2026, Vivante IISER Tirupati, Joel Jazz), so check they're happy to be featured.
- Unsplash (free licence, no credit required): band-beams, closing, show-campus, show-fest, svc-*.
  RVCE and Xavier Jaipur cards use stock photos until real ones are available.

## Artists
- `artists.html`: the roster (143 artists, 4 tiers, 12 genres) with search, filters and a shortlist that opens the enquiry form with those artists filled in.
- The list lives in `data/artists.json` at the repo root. The app loads the same file into its Roster once per database (`artist-roster-2026-11` in `src/db/dataImports.ts`).
- After editing the list, run `node lunawave-website/sync-artists.mjs` from the repo root to refresh `artists.js` for the site. For the app, add a new data-set entry with a new name so existing databases pick up the additions.
