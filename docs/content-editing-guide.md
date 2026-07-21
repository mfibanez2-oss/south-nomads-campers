# Editing this site (no coding required)

This is a plain static site — no build step. Every page is a regular `.html` file you can open and edit directly. Two folders, `en/` and `es/`, mirror each other page for page.

## Change a price
Edit `shared/data/pricing.json`. It's shared by both languages and both camper pages — one edit updates the whole site.

- `rates.high/mid/low.under_threshold_per_day` — price per day for trips up to 14 days.
- `rates.high/mid/low.over_threshold_per_day` — price per day for trips of 15+ days.
- `deposit_percent` — currently `0.5` (50%).
- `fallback_clp_rate` — used only if the live exchange rate API is down. Update this every few months to a realistic USD→CLP rate.

## Add or edit a review
Edit **both** `shared/data/reviews.en.json` and `shared/data/reviews.es.json`. Use the same `id` for the same reviewer in both files so they line up. Fields:
- `name`, `location`, `rating` (1–5), `quote`
- `google_url` — the reviewer's personal Google Maps link if you have one (copy the "share" link from the review in your Google Business Profile). Leave it as the business's general Google listing URL if you don't have a per-review link yet.
- `featured: true` shows the review on the homepage as well as the full reviews page.

## Add or edit an FAQ
Edit `shared/data/faq.en.json` and `shared/data/faq.es.json`. Each entry is `{ "q": "...", "a": "..." }` inside a category. The `a` field accepts simple HTML (`<p>`, `<ul><li>`, `<strong>`).

## Add a photo
Drop the image into the matching folder under `shared/img/` (`nomads-l/`, `nomads-m/`, `lifestyle/`, `patagonia/`) and reference it with an `<img src="/shared/img/...">` tag on the page you want it on.

## Known open items (flagged during the build)
- **Floorplan diagrams** (`shared/img/floorplans/nomads-l.svg`, `nomads-m.svg`) are first-draft schematics based on interior photos. Before relying on them for customer expectations, confirm: the exact bed-conversion mechanism per model, water tank/fridge placement, portable toilet storage, and which base vehicle (Hilux/D-Max/L200/Maxus) they should depict.
- **Custom domain**: the site is not yet pointed at `southnomadscampers.com`. That needs a `CNAME` file in this repo plus a DNS change with your domain provider — done as a deliberate follow-up once the `github.io` URL is verified working.
- **More Google review links**: only 4 reviews have a personal Google Maps deep link so far (Leonie, Josse, Rhys, Andreas). If you can grab more from your Google Business Profile's "reviews" tab (look for a share icon on each review), add them to the JSON files above.
