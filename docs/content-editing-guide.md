# Editing this site (no coding required)

This is a plain static site — no build step. Every page is a regular `.html` file you can open and edit directly. Two folders, `en/` and `es/`, mirror each other page for page.

## Change a price
Edit `shared/data/pricing.json`. It's shared by both languages and both camper pages — one edit updates the whole site.

- `models.<model>.rates.high/mid/low.under_threshold_clp_per_day` — price per day for trips up to 14 days.
- `models.<model>.rates.high/mid/low.over_threshold_clp_per_day` — price per day for trips of 15+ days.
- `deposit_percent` — currently `0.5` (50%).

**If the booking engine (see below) is live, also update `south-nomads-booking-api/src/data/pricing.snapshot.json`** with the same values and redeploy the Worker (`npm run deploy` in that repo) — the Worker keeps its own copy so it never has to trust a client-submitted price, and it does not read this file automatically.

## Change a pickup/drop-off hub fee
Edit `shared/data/hubs.json` (fee in CLP, plus EN/ES labels) and the matching static prose on the Rental Hubs page (`en/hubs/index.html`, `es/hubs/index.html`) — the JSON isn't read by any page today, it's only kept in sync for the dormant booking-engine backend (see below). **If that backend gets wired back up, also update `south-nomads-booking-api/src/data/hubs.snapshot.json`** with the matching `fee_clp` values and redeploy the Worker.

## The single lead form (Contact page)
`shared/js/contact-form.js` powers the one form on `en/contact.html`/`es/contact.html` — the **only** form on the site. The Nomads L and Nomads M pages just have a "Get a Quote" CTA button linking to that Contact page; there's no separate form per camper anymore.

On submit, it does three things:
1. Validates every field is filled in properly (name, valid email, a real complete phone number — rejects things like a bare "+1" country code — and a message).
2. POSTs the lead to the `south-nomads-booking-api` Worker's `/contact` endpoint, which emails it to `josefina@southnomadscampers.com` and `rodrigo@southnomadscampers.com` via Resend.
3. On success, redirects (full page navigation, not an inline message) to `en/thank-you.html`/`es/thank-you.html`. That page pushes a `generate_lead` event to `window.dataLayer` for GTM to pick up — **that pageview is the actual Google Ads conversion signal**, so don't remove or rename that page without updating the conversion action in Google Ads to match.

If the Worker call fails (e.g. it isn't deployed yet), the form shows an inline error with a WhatsApp fallback link instead of redirecting — a lead is never silently lost.

- A full automatic booking engine (real-time availability, embedded SumUp card payment) was built separately and still exists at `south-nomads-booking-api` (a Cloudflare Worker + D1 database), fully configured and deployable, but it is **not currently wired into the site** — this was a deliberate choice to keep things simple for now. See that repo's `README.md` if you want to switch back to it later.

## Google Tag Manager
Every page loads GTM container `GTM-P62RC9MN` (head script + body noscript iframe, right after `<head>`/`<body>`). GA4 and the Meta Pixel are both configured inside that GTM container, not hardcoded in this repo — manage them from tagmanager.google.com, not by editing HTML here.

## Add or edit a review
Edit **both** `shared/data/reviews.en.json` and `shared/data/reviews.es.json`. Use the same `id` for the same reviewer in both files so they line up. Fields:
- `name`, `location`, `rating` (1–5), `quote`
- `google_url` — the reviewer's personal Google Maps link if you have one (copy the "share" link from the review in your Google Business Profile). Leave it as the business's general Google listing URL if you don't have a per-review link yet.
- `featured: true` shows the review on the homepage as well as the full reviews page.

## Add or edit an FAQ
Edit `shared/data/faq.en.json` and `shared/data/faq.es.json`. Each entry is `{ "q": "...", "a": "..." }` inside a category. The `a` field accepts simple HTML (`<p>`, `<ul><li>`, `<strong>`).

## Add a photo
Drop the image into the matching folder under `shared/img/` (`nomads-l/`, `nomads-m/`, `lifestyle/`, `patagonia/`) and reference it with an `<img src="/shared/img/...">` tag on the page you want it on.

## Add or edit a blog post

The blog lives at `en/blog/` and `es/blog/`. Each post is its own folder with a single
`index.html` (e.g. `es/blog/arrendar-camper-en-chile/index.html`). There is no CMS and no
build step - the HTML **is** the post.

**To edit an existing post:** open its `index.html` and edit the text inside
`<div class="post-body">`. Everything else (header, footer, author box, CTA) is boilerplate
copied from the other pages.

**To add a new post**, copy the folder of an existing post and change, in order:

1. **Folder name** - it is the URL, so make it a keyword phrase in that language
   (`es/blog/mi-nuevo-tema/`). The English and Spanish versions have *different* slugs on
   purpose, translated for search.
2. `<title>`, `<meta name="description">` (aim for 150-160 characters), `<meta name="keywords">`,
   and the `og:`/`twitter:` copies of the title and description.
3. `<link rel="canonical">` and the two `<link rel="alternate" hreflang=...>` tags - these must
   point at the new EN and ES URLs. **The EN/ES language switch reads those hreflang tags**
   (`shared/js/lang-toggle.js`), so if they are wrong the switch sends readers to the wrong page.
4. The JSON-LD block at the end of `<head>`: `headline`, `description`, `image`, `datePublished`,
   `dateModified`, the breadcrumb `name`/`item`, and the FAQ questions and answers. Keep the FAQ
   entries in the JSON-LD identical to the visible `<details>` block at the bottom of the page -
   Google penalises mismatches.
5. The visible content: `<h1>`, the standfirst, the table of contents (`.post-toc` links must match
   the `id` of each `<h2>`), the body, and the FAQ `<details>` items.
6. **Add the post to both blog index pages** (`en/blog/index.html`, `es/blog/index.html`) by copying
   an existing `<article class="card post-card">` block. The `data-cat` attribute must be one of
   `planificar`, `rutas`, `camper` - it drives the category filter chips.
7. **Add both URLs to `sitemap.xml`** with a `<lastmod>` date.
8. Link to the new post from two or three existing posts, and link out from it to the money pages
   (campers, itineraries, contact). Internal links are most of what makes a new post rank.

Blog-only styling lives in `shared/css/pages/blog.css` (callouts, tables, the author box, the FAQ
accordion). Useful blocks you can copy inside `post-body`:
`<div class="callout">`, `<div class="callout warn">`, `<div class="post-cta">`, and
`<div class="table-scroll"><table>...</table></div>` (the wrapper is what stops wide tables from
breaking the page on a phone).

Photos come from `shared/img/` like everywhere else. The author photo is
`shared/img/lifestyle/rodrigo-avatar.jpg`, cropped from `Rodrigo.png`.

## Known open items (flagged during the build)
- **Custom domain**: the site is not yet pointed at `southnomadscampers.com`. That needs a `CNAME` file in this repo plus a DNS change with your domain provider — done as a deliberate follow-up once the `github.io` URL is verified working.
- **More Google review links**: only 4 reviews have a personal Google Maps deep link so far (Leonie, Josse, Rhys, Andreas). If you can grab more from your Google Business Profile's "reviews" tab (look for a share icon on each review), add them to the JSON files above.
