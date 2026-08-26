# Befach — India's wholesale marketplace

A working prototype of the Faire model rebuilt for India: independent Indian
makers sell wholesale to independent Indian retailers.

**233 products · 3 brands · 20 categories**, seeded from real catalogues.

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

## Data sources

| Brand | Products | Ships from | Source |
|---|---|---|---|
| Two Brothers Organic Farms | 83 | Pune, MH | `twobrothersindiashop.csv` (supplied) |
| Happilo | 136 | Bengaluru, KA | `happilo.com/products.json` |
| Overra Herbals | 14 | Bathinda, PB | `overraherbals.com/products.json` |

Overra's feed lists each SKU twice — once as a single unit and once as a
multipack (clean 2x/4x/5x price ratios). The build keeps single units only and
derives its own case packs, so nothing is double-counted.

## Layout

```
docs/                  the website — this is what you deploy
  index.html           shell: header, category nav, footer
  assets/styles.css    design system (tokens, components, responsive)
  assets/app.js        hash router, catalogue views, cart, trade-account gate
  assets/data.js       GENERATED — do not edit by hand
build/
  happilo.js           pulls the Happilo feed    -> happilo-raw.json
  overra.js            pulls the Overra feed     -> overra-raw.json
  catalog.js           all sources               -> catalog.json
  data.js              catalog.json              -> docs/assets/data.js
  fetchimgs.js         downloads product photos  -> build/img/
  optimise.js          re-encodes to 300px JPEGs -> build/img-opt/
  artifact.js          bundles everything        -> befach-artifact.html
serve.js               zero-dependency static server
```

## Rebuilding

After editing the taxonomy, the pricing rules, or the brand records:

```bash
node build/catalog.js && node build/data.js
```

Full rebuild, including re-scraping and the single-file bundle:

```bash
node build/happilo.js && node build/overra.js && node build/catalog.js && node build/data.js && node build/fetchimgs.js && node build/optimise.js && node build/artifact.js
```

`build/img/`, `build/img-opt/` and `befach-artifact.html` are gitignored — they
are large and fully regenerable by the commands above.

`optimise.js` needs `sharp` (`npm install`). It exists because the Shopify CDN
refuses to downscale some PNGs — five were 2 MB each, which alone blew the
single-file build past its size budget. It takes 18.8 MB of source photography
down to 2.3 MB.

## Adding a brand

Most Indian D2C stores run on Shopify and expose `/products.json`, so a new
brand is three small edits:

1. A scraper in `build/` (copy `overra.js`, change the domain).
2. A `shopifySource(...)` call in `build/catalog.js`. Per-store quirks go in the
   options object — `keep` to filter listings, `title` and `usp` to override the
   default copy extraction.
3. A brand record in `build/data.js` (minimums, lead time, ships-from, story).

Then rebuild. Two things to watch:

- **Taxonomy order matters.** `RULES` in `catalog.js` is first-match-wins.
  Combo titles list their contents, so they must be tested before sugar/flour/
  rice; wellness drink mixes before the generic `/mix/`; date-palm jaggery
  before `/dates?/`.
- **Use word boundaries in value rules.** 42 products in these feeds contain the
  word "alternative", which was silently tagging half the catalogue as
  native-variety until `\bnative\b` fixed it.

## The model, as implemented

| Faire | Befach |
|---|---|
| Wholesale price vs MSRP | Wholesale vs MRP, margin % on every card |
| Net 60 payment terms | Pay 60 days after delivery, nothing up front |
| Free returns on opening order | Same, surfaced on the product page and in cart |
| Per-brand order minimums | Rs 8,000–15,000 opening, progress meter per brand |
| Pricing hidden until sign-up | Prices blur until a trade account is opened |
| One cart across brands | Cart groups by brand, each with its own minimum and freight |
| Shop by values | Low GI, chemical-free, superfood, native variety, and more |
| 15% new / 3% reorder take | Same, stated on the seller page |

Checkout is blocked until *every* brand in the cart clears its own opening
minimum. Wholesale is derived at a 50% keystone margin off MRP and case packs
scale by price band — both live in `trade()` in `build/catalog.js`.

## Routes

`#/` · `#/browse?cat=&b=&v=&sort=&q=` · `#/p/<slug>` · `#/brand/<id>` ·
`#/cart` · `#/join` · `#/sell`

## Before this goes live

- **The product photography and brand marks belong to Two Brothers Organic
  Farms, Happilo and Overra Herbals.** They are seed data for a prototype, used
  without permission. Get written consent or replace them with your own shoots
  before this is public, investor-facing, or deployed under a real domain.
- **Wholesale prices here are derived, not real** — a flat 50% off MRP. Every
  brand negotiates its own rate and case pack.
- Cart, accounts and orders are `localStorage` only. Real trade accounts need a
  backend, GSTIN verification, and a credit underwriter to carry the 60-day terms.
- "Befach" is a placeholder name — check trademark availability before committing.
