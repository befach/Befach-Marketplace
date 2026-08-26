# Befach — India's wholesale marketplace

A working prototype of the Faire model rebuilt for India: independent Indian
makers sell wholesale to independent Indian retailers.

**966 products · 12 brands · 26 categories**, seeded from real catalogues.

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

`befach-artifact.html` is the same site as a single self-contained file (12.5 MB,
every image inlined) — open it directly or host it anywhere, no server needed.

## Data sources

| Brand | Products | Ships from | Source |
|---|---|---|---|
| Happilo | 136 | Bengaluru, KA | `happilo.com/products.json` |
| Wellbeing Nutrition | 128 | Mumbai, MH | `wellbeingnutrition.com/products.json` |
| Slurrp Farm | 107 | Gurugram, HR | `slurrpfarm.com/products.json` |
| Conscious Food | 106 | Mumbai, MH | `consciousfood.com/products.json` |
| Open Secret | 94 | Mumbai, MH | `opensecret.in/products.json` |
| Two Brothers Organic Farms | 134 | Pune, MH | `twobrothersindiashop.com/products.json` |
| Yogabar | 58 | Bengaluru, KA | `yogabars.in/products.json` |
| The Whole Truth Foods | 58 | Bengaluru, KA | `thewholetruthfoods.com/llmFeed.json` |
| Farmley | 50 | Noida, UP | `farmley.com/products.json` |
| Nourish Organics | 50 | New Delhi, DL | `nourishorganics.in/products.json` |
| Rage Coffee | 31 | New Delhi, DL | `ragecoffee.com/products.json` |
| Overra Herbals | 14 | Bathinda, PB | `overraherbals.com/products.json` |

Ten of the eleven online stores are Shopify and expose `/products.json`.
**The Whole Truth is Next.js** with no such endpoint — but its sitemap advertises
an `llmFeed.json`, a catalogue it publishes for machine reading. `llmFeedSource()`
in `build/catalog.js` reads that flat format instead.

Every feed had its own trap. All are handled in `build/catalog.js`:

- **Multipacks sold as variants.** Wellbeing, Yogabar and Farmley list "Pack of 1"
  through "Pack of 6" and "500g x 3" as variants of one product. The reader
  anchors on the **cheapest** variant, the base unit. Anchoring on the dearest
  listed a 989-rupee product at 5,935 and halved that into a nonsense wholesale
  rate.
- **Multipacks sold as separate products.** Overra and The Whole Truth list the
  single and the box as different SKUs. Both readers keep the single where one
  exists, and the cheapest pack where the line is box-only.
- **Non-stock listings.** Shakers, gym bags, lab-test bookings, free samples,
  tote bags, gift cards — and one children's picture book. `isNotStock()` drops
  them across every source.
- **Flavour-only names.** Farmley's "Cheesy Cheddar - Pack of 4" is roasted
  makhana and only the description says so, so categorisation falls back to the
  body text — but only for rules naming a product *form*. Letting claim words
  read the body filed that makhana under protein powder, because the copy says
  "rich in plant protein".

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
single-file build past its size budget. It takes 140 MB of source photography down to 8 MB.

`build/data.js` stamps a content hash onto each asset URL in `index.html`
(`assets/data.js?v=a4634dcf`). Without it a returning visitor can pair new markup
with a cached old `data.js` — which is exactly how the Haat-to-Befach rename
produced a live page with zero products.

## Adding a brand

Most Indian D2C stores run on Shopify and expose `/products.json`, so a new brand
is three small edits:

1. `node build/scrape.js <domain> <name>-raw.json` (check the store is Shopify
   first — `/products.json` returning HTML means it is not).
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
| Wholesale price vs MSRP | Each brand's own listed price vs its MRP, discount % shown |
| Net 60 payment terms | Pay 60 days after delivery, nothing up front |
| Free returns on opening order | Same, surfaced on the product page and in cart |
| Per-brand order minimums | Rs 8,000–20,000 opening, progress meter per brand |
| Pricing hidden until sign-up | Prices blur until a trade account is opened |
| One cart across brands | Cart groups by brand, each with its own minimum and freight |
| Shop by values | Low GI, vegan, chemical-free, superfood, native variety, and more |
| 15% new / 3% reorder take | Same, stated on the seller page |

Checkout is blocked until *every* brand in the cart clears its own opening
minimum.

**Every purchasable option carries its own price.** `variants` holds each size
with its own price, mrp and discount, so choosing 500ml vs 1000ml actually moves
the figure. Storing only the size *names* was a bug: both showed the product
default.

The supplied Two Brothers CSV is a scrape of their listing page — its size
options are links to sibling products, not variants, and it has no per-size
price. Prices and variants now come from their own `products.json`; the CSV is
still read for the ratings the feed lacks, joined on product handle.

**Pricing is mirrored, never derived.** `price` is what the brand actually
charges for its default variant and `mrp` is that variant's struck-through
compare-at, taken straight from the source feed. Descriptions are the brand's
own words, tags stripped, attributed on the product page.

An earlier build showed MRP as the headline and invented a wholesale rate at a
flat 50% off, so every figure on the site disagreed with the brand's own
storefront. Real trade rates are negotiated per brand at onboarding; until they
exist the product page says so rather than showing a made-up number.

## Performance note

Browse pages in blocks of 60 with a Show more button. Rendering all 915 cards
at once cost 2 seconds, 20,000 DOM nodes and a page 169,000px tall. Add-to-cart
is a single delegated listener so cards appended by Show more work without
rebinding.

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
