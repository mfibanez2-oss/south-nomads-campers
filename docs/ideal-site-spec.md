# South Nomads Campers — Ideal Site Specification (Frontend + Backend)

## Brand & positioning
South Nomads Campers is a young, owner-operated camper rental company based in Puerto Varas, Chile, at the gateway to the Carretera Austral. Two models: **Nomads L** (4x4 camper truck, sleeps up to 4, full-size) and **Nomads M** (4x4 camper truck, compact, for 2). Target customer: international travelers — especially European millennials — planning a multi-week Patagonia/Carretera Austral road trip and comparing several rental operators before committing real money to a company they've never seen in person.

Positioning is honest, not inflated: a new company (not "since 2014"), but one that knows the territory, builds/checks every camper personally, and gives real people (not a call center) on WhatsApp. Small-team personal attention is the differentiator, not scale or years in business.

## Design system
- **Typography**: Epilogue (display font, weight 800) for headings — big, bold, uppercase (`h1`/`h2` are `text-transform: uppercase`). Inter for body text.
- **Type scale**: hero `clamp(2.75rem, 9vw, 5.5rem)`, h1 `clamp(2.2rem, 6vw, 3.75rem)`, h2 `clamp(1.75rem, 4.5vw, 2.75rem)` — noticeably larger than a typical marketing site, editorial-poster feel.
- **Section rhythm**: full-bleed solid-color blocks alternating down the page (not a literal copy of any single competitor's palette, but South Nomads' own brand colors used the same structural way Camperworld Chile uses theirs) — dark forest green, vivid ember orange, cream/ice, and white, in sequence, so each section visually resets against the last. Ember is reserved for the highest-intent conversion moments (quote/CTA sections).
- **Brand colors**: forest `#1a4723` / forest-dark `#123318`, ember `#d79051` / ember-dark `#c4823e`, ice `#eef4f7`, ink `#1a1a1a`.
- **Logo**: prominent in the header (68px tall, up from the original 48px).
- Reusable CSS utility classes (`.block-dark`, `.block-forest`, `.block-ember`, `.block-cream`, `.block-white` in `shared/css/base.css`) so any section can take the treatment with one class, text colors auto-adjust for contrast.

## Site structure
Static HTML/CSS/vanilla JS, **no build step**, no framework — hosted on GitHub Pages. Fully bilingual, `en/` and `es/` trees mirror each other page-for-page. Pages: Home, Nomads L, Nomads M, Destinations, Itineraries, Rental Hubs, FAQ, About Us, Reviews, Contact, and a cross-promo link out to the Patagonia Pass (a separate 28-day flagship product on its own Netlify funnel).

## Booking/quote flow — current, live
Each camper page has a **"Get a Quote"** section (ember block) with:
1. Travel month + trip length (day-count pills or custom number) → live price computed client-side from `pricing.json` (season × duration-threshold rate table; the 15+ day rate applies retroactively to the whole trip).
2. Pickup/drop-off hub selects (`hubs.json`) with the fee shown inline; fees are summed per leg independently, so choosing the same non-Puerto-Varas hub for both pickup and drop-off correctly charges that hub's fee twice.
3. Deposit shown live = 50% of (rental total + hub fees).
4. "My dates are flexible" checkbox — skips exact pricing, still captures the lead.
5. Contact fields (name, email, phone) + a required "25+ years old, valid license" checkbox.
6. **"Send by WhatsApp"** — opens a prefilled `wa.me` deep link with the full trip summary (camper, dates, hubs, price, contact info) straight into the owner's WhatsApp. **"Send by Email"** — same summary via `mailto:`.

This flow ends with a human (Josefina) manually confirming availability and sending a payment link — intentionally simple, no live availability check, no payment on the page. Chosen deliberately over the fuller flow below, for now, to keep the first version simple and fast to ship.

## Booking/payment flow — ideal / future (backend already built, not yet wired to the frontend)
The original goal, and the one to eventually reconnect once the business has volume to justify it:
- **Real-time availability, Airbnb-style**: a calendar on the camper page greys out dates already booked for that model, backed by a real database — no more "ask and wait to find out."
- **Embedded card payment**: SumUp's Checkout API creates a checkout server-side for the exact computed deposit amount; SumUp's Payment Widget renders an inline card form directly on the page — no redirect, no new tab, 3D-Secure handled in an iframe.
- **Backend**: a separate Cloudflare Worker repo (`south-nomads-booking-api`) with a D1 (SQLite) database. Reservations table tracks camper model, dates, hubs, customer info, computed amounts, SumUp checkout id, and status (`pending_payment`/`confirmed`/`cancelled`/`expired`).
- **Race-safety**: booking holds are created via a single guarded SQL `INSERT ... WHERE NOT EXISTS (...)` so two customers can never double-book the same dates in the gap between a check and a write. Holds expire after 20 minutes; a cron job sweeps stale holds every 15 minutes.
- **Endpoints**: `GET /availability`, `GET /availability/months` (calendar data), `POST /reservations/hold` (validates input, computes price server-side so it can't be tampered with client-side, creates the SumUp checkout), `POST /reservations/confirm` (re-verifies payment status directly against SumUp's API — never trusts the browser's success event), and a password-protected `/admin` dashboard to view/cancel reservations.
- **Confirmation email** on successful payment via Resend: from `reservas@southnomadscampers.com`, reply-to and BCC to `josefina@southnomadscampers.com` so she's notified of every booking automatically without checking the admin panel.
- **Deposit** = 50% of (rental total + hub fees), same math as the current live quote form, just enforced authoritatively server-side instead of trusted from the client.

Current setup status: Cloudflare account created, D1 database created and migrated (local + remote), SumUp sandbox API key loaded as a Worker secret, sandbox merchant code set. Still pending: SumUp live API key + merchant code (for going live), Resend domain verification for `southnomadscampers.com` (DNS records not yet added — domain currently sits on legacy Google Domains nameservers, migrated to Squarespace's back end under an as-yet-unidentified login), final `wrangler deploy`, and re-wiring the frontend quote form to call this Worker instead of ending in WhatsApp/Email.

## Content & copy voice
Confident, direct, benefit-driven. Short paragraphs, bold key phrases, no filler. Practical trip-planning content (border-crossing paperwork into Argentina, insurance deductibles, driving requirements, what's included) is treated as a trust-building tool for first-time Patagonia travelers, not just SEO filler.

## Known trust gaps to close next
- Only 4 Google reviews today — the single highest-leverage trust signal to grow for an international customer who's never seen the campers in person.
- Response speed on WhatsApp/Email quote requests matters more than usual since there's no instant confirmation — especially across the Chile↔Europe time difference.
- Instagram now linked from the homepage footer (`instagram.com/southnomadscampers`) as an additional trust/discovery channel.
