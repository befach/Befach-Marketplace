# Befach — India's wholesale marketplace

A working prototype of the Faire model rebuilt for India: independent Indian
makers sell wholesale to independent Indian retailers.

**469 products · 6 brands · 24 categories**, seeded from real catalogues.

## See it live

**https://befach.github.io/Befach-Marketplace/**

GitHub Pages serves the `gh-pages` branch, which holds the contents of `docs/`
at its root. Edit `docs/` on `main` as normal, then ship both branches with:

```bash
npm run deploy
```

That pushes `main` and then re-publishes `docs/` to `gh-pages` via git subtree.
Pages rebuilds in a minute or two. Pushing only to `main` will NOT update the
live site — the subtree push is the part that does it.

## Run it locally

```bash
node serve.js
```

Then open http://localhost:4321 — no build step needed, `docs/` is ready to serve.

`befach-artifact.html` is the same site as a single self-contained file (5.7 MB,
every image inlined) — open it directly or host it anywhere, no server needed.

## Data sources

| Brand | Products | Ships from | Source |
|---|---|---|---|
| Two Brothers Organic Farms | 83 | Pune, MH | `twobrothersindiashop.csv` (supplied) |
| Happilo | 136 | Bengaluru, KA | `happilo.com/products.json` |
| Wellbeing Nutrition | 128 | Mumbai, MH | `wellbeingnutrition.com/products.json` |
| Yogabar | 58 | Bengaluru, KA | `yogabars.in/products.json` |
| Farmley | 50 | Noida, UP | `farmley.com/products.json` |
| Overra Herbals | 14 | Bathinda, PB | `overraherbals.com/products.json` |

Every feed had its own trap. All are handled in `build/catalog.js`:

- **Overra** lists each SKU twice — once as a single unit, once as a multipack at
  clean 2x/4x/5x ratios. The build keeps single units only.
- **Wellbeing, Yogabar and Farmley** sell multipacks as *variants* ("Pack of 1"
  through "Pack of 6", "500g x 3"). The reader anchors on the **cheapest**
  variant, the base unit. Anchoring on the dearest listed a 989-rupee product at
  5,935 and halved that into a nonsense wholesale rate.
- **Wellbeing** also lists shakers, gym bags, lab-test bookings and free samples.
  None are shelf stock, so `keep` filters them out.
- **Farmley** names some products by flavour alone ("Cheesy Cheddar - Pack of 4").
  They are roasted makhana, and only the description says so.

## Layout

```
docs/                  the website (GitHub Pages serves this folder)
  index.html           shell: header, category nav, footer
  assets/styles.css    design system (tokens, components, responsive)
  assets/app.js        hash router, catalogue views, cart, trade-account gate
  assets/data.js       GENERATED — do not edit by hand
build/
  scrape.js            generic Shopify products.json reader (domain -> raw json)
  happilo.js           per-brand scraper wrappers
  overra.js
  catalog.js           all sources -> catalog.json (taxonomy + trade pricing)
  data.js              catalog.json -> docs/assets/data.js, stamps cache-busters
  fetchimgs.js         downloads product photos  -> build/img/
  optimise.js          re-encodes to 300px JPEGs -> build/img-opt/
  artifact.js          bundles everything        -> befach-artifact.html
serve.js               zero-dependency static server
```

## Rebuilding

After editing the taxonomy, the pricing rules, or the brand records:

```bash
npm run build
```

Full rebuild, including re-scraping and the single-file bundle:

```bash
npm run scrape && npm run build && npm run images && npm run bundle
```

`build/img/`, `build/img-opt/` and `befach-artifact.html` are gitignored — large
and fully regenerable by the commands above.

`optimise.js` needs `sharp` (`npm install`). It exists because the Shopify CDN
refuses to downscale some PNGs — five were 2 MB each, which alone blew the
single-file build past its size budget. It takes 26 MB of source photography
down to 4 MB.

`build/data.js` stamps a content hash onto each asset URL in `index.html`
(`assets/data.js?v=a4634dcf`). Without it a returning visitor can pair new markup
with a cached old `data.js` — which is exactly how the Haat-to-Befach rename
produced a live page with zero products.

## Adding a brand

Most Indian D2C stores run on Shopify and expose `/products.json`, so a new brand
is three small edits:

1. `node build/scrape.js <domain> <name>-raw.json`
2. A `shopifySource(...)` call in `build/catalog.js`. Per-store quirks go in the
   options object — `keep` to filter listings, `title` and `usp` to override the
   default copy extraction, `stripName` to strip brand noise from titles.
3. A brand record in `build/data.js` (minimums, lead time, ships-from, story).

Then `npm run build`. Three things to watch:

- **Taxonomy order matters.** `RULES` is first-match-wins. Combos are tested
  before sugar/flour/rice, bars before the generic `/bar\b/`, breakfast before
  trail-mix's `/muesli/`, wellness before the generic `/mix/`.
- **Claim words are title-only.** Categorisation falls back to the description
  when a title yields nothing, but only for rules naming a product *form*.
  Marketing copy says "rich in plant protein" about roasted makhana.
- **Use word boundaries in value rules.** 42 products across these feeds contain
  "alternative", which silently tagged half the catalogue as native-variety until
  `\bnative\b` fixed it.

## The model, as implemented

| Faire | Befach |
|---|---|
| Wholesale price vs MSRP | Wholesale vs MRP, margin % on every card |
| Net 60 payment terms | Pay 60 days after delivery, nothing up front |
| Free returns on opening order | Same, surfaced on the product page and in cart |
| Per-brand order minimums | Rs 8,000–20,000 opening, progress meter per brand |
| Pricing hidden until sign-up | Prices blur until a trade account is opened |
| One cart across brands | Cart groups by brand, each with its own minimum and freight |
| Shop by values | Low GI, vegan, chemical-free, superfood, native variety, and more |
| 15% new / 3% reorder take | Same, stated on the seller page |

Checkout is blocked until *every* brand in the cart clears its own opening
minimum. Wholesale is derived at a 50% keystone margin off MRP and case packs
scale by price band — both live in `trade()` in `build/catalog.js`.

## Routes

`#/` · `#/browse?cat=&b=&v=&sort=&q=` · `#/p/<slug>` · `#/brand/<id>` ·
`#/cart` · `#/join` · `#/sell`

## Before this goes live

- **The product photography and brand marks belong to Two Brothers Organic Farms,
  Happilo, Overra Herbals, Yogabar, Wellbeing Nutrition and Farmley.** They are
  seed data for a prototype, used without permission, and the repo is public. Get
  written consent or replace them with your own shoots before this is
  investor-facing or served under a real domain.
- **Wholesale prices here are derived, not real** — a flat 50% off MRP. Every
  brand negotiates its own rate and case pack.
- Cart, accounts and orders are `localStorage` only. Real trade accounts need a
  backend, GSTIN verification, and a credit underwriter to carry the 60-day terms.
