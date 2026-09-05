/* ------------------------------------------------------------------
   Builds catalog.json from every seeded source.
     - Two Brothers Organic Farms  <- twobrothersindiashop.csv
     - Happilo                     <- happilo-raw.json (Shopify products.json)
     - Cococart                    <- cococart-raw.json (Shopify products.json)
   One shared taxonomy so a category means the same thing for both.
   ------------------------------------------------------------------ */
const fs = require('fs');
const path = require('path');

/* ---------------- csv ---------------- */
function parseCSV(s){const r=[];let f='',row=[],q=false;
for(let i=0;i<s.length;i++){const c=s[i];
 if(q){ if(c==='"'){ if(s[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
 else { if(c==='"')q=true; else if(c===','){row.push(f);f='';}
   else if(c==='\n'){row.push(f);f='';if(row.some(x=>x!==''))r.push(row);row=[];}
   else if(c!=='\r')f+=c; }}
if(f!==''||row.length){row.push(f);r.push(row);}return r;}

const money = v => { const n = parseFloat(String(v||'').replace(/[^0-9.]/g,'')); return isNaN(n)?0:Math.round(n); };
const slug  = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);

/* ---------------- shared taxonomy ---------------- */
/* order matters: first regex that matches wins */
const RULES = [
  ['home-ritual',     /dhoop|incense|agarbatti/i],
  ['gifting',         /gift|celebration|hamper|festive|rakhi|\bbox\b|chocolate edit|treats/i],
  /* combo titles list their contents, so they must be caught before
     sugar / flour / rice / nuts pull them apart */
  ['combos',          /\bcombo\b|\(\s*\d+\s*pack\s*\)|multipack|value pack/i],
  /* bars before snacks-sweets (/bar\b/) and before protein-powder, so a
     "20g Protein Bar" lands as a bar rather than a powder */
  /* fudge and cocoa here too: The Whole Truth names bars by flavour, so
     "Almond Choco Fudge" was landing in nuts and "Cocoa Cranberry" in
     dried fruit */
  ['bars',            /protein bar|snack bar|energy bar|granola bar|\bbars?\b|date bites|date melts|munch|fudge|\bcocoa\b/i],
  /* breakfast before trail-mix, which also claims /muesli/ */
  ['breakfast',       /muesli|granola|\boats?\b|porridge|cereal|breakfast/i],
  /* mixes and batters, before attas-flours claims /poha/ and /flour/ */
  ['ready-to-cook',   /noodle|pancake|\bdosa\b|\bidli\b|\bupma\b|\bsoup\b|ready to cook|ready-to-cook|instant mix|batter|\bpasta\b|vermicelli mix/i],
  ['protein-powder',  /whey|protein powder|protein shake|plant protein|kids protein|vegan protein|protein sachet|isolate|casein|fermented yeast protein|\bmass gainer\b/i],
  ['supplements',     /creatine|vitamin|\bfibre?\b|mineral|kadha|radiant skin|skin pack|collagen|capsule|tablet|effervescent|shilajit|electrolyte|melts?\s*strip|gummies|liposomal|glutathione|apple cider|\bacv\b|omega|multivitamin|probiotic|\bjuice\b|sea buckthorn|skin fuel/i],
  ['ghee-dairy',      /ghee|colostrum/i],
  ['oils',            /\boil\b|oil,|oil i|oil spray/i],
  /* wellness drink mixes must beat the generic /mix/ in trail-mix */
  ['wellness',        /chyawanprash|amlaprash|moringa|golden milk|thandai|shikanji|panjiri|ashwagandha|brahmi|shatavari|herbal tea|lemon tea/i],
  /* after wellness, so Overra's low-GI "Dia Lemon Tea" stays a wellness SKU */
  ['coffee-tea',      /coffee|espresso|arabica|robusta|\bchai\b|green tea|black tea|tea bags?|\btea\b/i],
  /* and date-palm jaggery must beat /dates?/ */
  ['sweeteners',      /jaggery|kaakvi|sap sugar|mishri|cane sugar|shakkar|shakker|\bsugar\b/i],
  ['makhana',         /makhana|fox nut|foxnut|phool makhana|lotus seed|chickpea|party snack|namkeen/i],
  ['dates',           /\bdates?\b|medjoul|kimia|safawi|ajwa|zahidi|kalmi|anjeer|abjosh/i],
  ['dried-fruit',     /raisin|prune|apricot|cranberr|blueberr|berries|dried|kishmish/i],
  ['trail-mix',       /trail mix|nut mix|nutmix|supermix|super mix|panchmewa|panchmeva|medley|party mix|muesli|\bmix\b/i],
  ['seeds',           /chia|flax|pumpkin seed|sunflower seed|\bseeds\b/i],
  ['nut-butters',     /peanut butter|almond butter|nut butter/i],
  ['nuts',            /almond|cashew|walnut|pistachio|pecan|brazil nut|peanut|\bnuts\b|kernel/i],
  ['attas-flours',    /atta|flour|satva|sattu|vermicelli|poha|wheat grain/i],
  ['honey-preserves', /honey|gulkand|murabba/i],
  ['spices',          /haldi|turmeric|saffron|chilli|salt|masala|cardamom|elaichi|black pepper|kaali mirch|coriander|dhania|cumin|jeera|clove|laung|cinnamon|dalchini|fennel|saunf|fenugreek|methi|bay leaf|nutmeg|asafoetida|hing|tamarind|imli|\bspice/i],
  ['pickles',         /pickle|ketchup/i],
  ['grains-dals',     /rice|\bdal\b|rajma|\bgram\b|moong|besan|quinoa|millet/i],
  ['snacks-sweets',   /laddoo|chakli|chips|mathri|mathari|katli|modak|barfi|bar\b|bites|sticks|krunch/i],
];

const CATS = {
  'nuts':            { name:'Nuts & Kernels',        tagline:'Almonds, cashews, walnuts and pistachios',            hi:'मेवा' },
  'combos':          { name:'Combo Packs',           tagline:'Multi-item bundles that ship as one SKU',             hi:'कॉम्बो' },
  'bars':            { name:'Bars & Energy Bites',   tagline:'Protein bars, date bites and on-the-go snacks',       hi:'बार' },
  'breakfast':       { name:'Muesli, Oats & Granola',tagline:'Wholegrain breakfast, ready in a bowl',               hi:'नाश्ता' },
  'coffee-tea':      { name:'Coffee & Tea',          tagline:'Instant blends, ground roasts and leaf tea',          hi:'चाय' },
  'ready-to-cook':   { name:'Ready to Cook',         tagline:'Pancake and dosa mixes, noodles and soups',           hi:'तैयार' },
  'protein-powder':  { name:'Protein & Shakes',      tagline:'Whey, plant protein and ready-to-drink',              hi:'प्रोटीन' },
  'supplements':     { name:'Supplements & Actives', tagline:'Collagen, capsules, melts and electrolytes',          hi:'सप्लीमेंट' },
  'dates':           { name:'Dates & Anjeer',        tagline:'Medjoul, Kimia, Safawi and Afghani figs',             hi:'खजूर' },
  'dried-fruit':     { name:'Dried Fruit & Berries', tagline:'Raisins, cranberries, apricots and prunes',           hi:'सूखे मेवे' },
  'seeds':           { name:'Seeds & Superfoods',    tagline:'Chia, flax, pumpkin and sunflower',                   hi:'बीज' },
  'trail-mix':       { name:'Trail Mixes',           tagline:'Everyday mixes, panchmewa and muesli',                hi:'मिक्स' },
  'makhana':         { name:'Makhana & Namkeen',     tagline:'Roasted fox nuts and spiced savouries',               hi:'मखाना' },
  'gifting':         { name:'Gift Hampers',          tagline:'Festive boxes and celebration packs',                 hi:'उपहार' },
  'attas-flours':    { name:'Attas & Ancient Grains',tagline:'Stone-ground Khapli, millet and heritage flours',     hi:'आटा' },
  'ghee-dairy':      { name:'Ghee & Dairy',          tagline:'Bilona-made Gir cow ghee and herbal infusions',       hi:'घी'  },
  'oils':            { name:'Cold-Pressed Oils',     tagline:'Wood-pressed, single-filtered, nothing stripped',     hi:'तेल' },
  'sweeteners':      { name:'Natural Sweeteners',    tagline:'Sulphur-free jaggery, palm sap and coconut sugar',    hi:'गुड़' },
  'honey-preserves': { name:'Honey & Preserves',     tagline:'Raw mono-floral honey, gulkand and murabba',          hi:'शहद' },
  'spices':          { name:'Spices & Salt',         tagline:'Single-origin haldi, saffron and Byadgi chilli',      hi:'मसाले'},
  'pickles':         { name:'Pickles & Condiments',  tagline:'Small-batch achaar, no vinegar, no shortcuts',        hi:'अचार' },
  'grains-dals':     { name:'Rice, Grains & Dals',   tagline:'Unpolished native varieties from Indian farms',       hi:'दाल'  },
  'nut-butters':     { name:'Nut Butters',           tagline:'Stone-ground, jaggery-sweetened, nothing else',       hi:'बटर' },
  'snacks-sweets':   { name:'Snacks & Mithai',       tagline:'Jaggery-sweetened laddoos and regional savouries',    hi:'मिठाई'},
  'wellness':        { name:'Ayurveda & Wellness',   tagline:'Chyawanprash, adaptogens and daily tonics',           hi:'आयुर्वेद'},
  'home-ritual':     { name:'Home & Ritual',         tagline:'Handmade dhoop and everyday puja essentials',         hi:'पूजा' },
  /* Cococart's shelf. Its own product_type is the source of truth for these,
     so they are never reached by RULES -- see cococartCategory. */
  'chocolate':       { name:'Chocolate',            tagline:'Bars, pralines, truffles and dragées',                 hi:'चॉकलेट' },
  'biscuits-spreads':{ name:'Biscuits & Spreads',   tagline:'Butter biscuits, wafers and cocoa spreads',            hi:'बिस्कट' },
  'candy-gum':       { name:'Candy, Mints & Gum',   tagline:'Lollipops, chewy mints and chewing gum',               hi:'कैंडी' },
};

/* Cococart types every listing itself, and its own labels are cleaner than
   anything a title regex would infer, so mirror them rather than run RULES.
   Adding /chocolate/ to RULES was the alternative, and it would have dragged
   Yogabar's dark-chocolate muesli and Whole Truth's cocoa bars out of the
   categories they already sit in. */
const CC_TYPES = {
  'chocolates':                 'chocolate',
  'chocolate':                  'chocolate',
  'gift hampers':               'gifting',
  'biscuits & spreads':         'biscuits-spreads',
  'protein bars & supplements': 'bars',
  'mints, candies & gums':      'candy-gum',
  'mints & chewing gum':        'candy-gum',
  'coffee & hot chocolate':     'coffee-tea',
};
/* Fifteen listings carry no type at all: four are empty gift boxes, one is
   ground coffee, the rest are dragées and bars. */
function cococartCategory(p) {
  const hit = CC_TYPES[String(p.product_type || '').trim().toLowerCase()];
  if (hit) return hit;
  const t = p.title || '';
  if (/\bcoffee\b/i.test(t)) return 'coffee-tea';
  if (/\bbox\b|basket|hamper|flatpack/i.test(t)) return 'gifting';
  return 'chocolate';
}

const VALUE_RULES = [
  ['organic',      /glyphosate-free|organic|no nasties|no additives|preservative free|no preservatives|100% natural|all natural/i],
  ['small-batch',  /small batch|handmade|artisinal|artisanal|heirloom|bilona|wood-fired|slow boiled|slow cooked/i],
  /* \b on native and desi: 42 feed products say "alternative", which was
     silently tagging half the catalogue as native-variety. */
  ['native-seed',  /\bnative\b|heirloom|ancient|\bdesi\b|single-origin|single origin|indigenous|kashmiri|mamra/i],
  ['gluten-free',  /gluten-free|gluten free|low gluten/i],
  ['no-refined',   /no refined sugar|jaggery|natural sweeten|zero sugar|no added sugar|unsweetened|mishri/i],
  ['cold-pressed', /cold-pressed|cold pressed|stoneground|stone-ground|stone ground|single-filtered|single filtered|single pressed/i],
  ['high-protein', /protein|fiber rich|fiber-rich|rich in protein|more fiber|rich in fibre|high fibre/i],
  ['superfood',    /superfood|super food|omega-3|omega 3|antioxidant|anti-oxidant|chia|flax|makhana|fox nut|nutrient-rich/i],
  ['low-gi',       /low gi|low-gi|glycemic|glycaemic|diabetic|diabeat/i],
  ['vegan',        /\bvegan\b|plant-based|plant based|dairy-free|dairy free/i],
];

/* Rules driven by claim words rather than product nouns. Marketing copy says
   "rich in plant protein" about roasted makhana, so these are title-only —
   letting them read the body filed Farmley's makhana under protein powder. */
const CLAIM_DRIVEN = new Set(['protein-powder', 'supplements', 'gifting', 'combos', 'bars']);

/* Two passes. Some titles name only a flavour — Farmley's "Cheesy Cheddar -
   Pack of 4" is roasted makhana, and only the description says so. So if the
   title yields nothing, consult the body, but only for product-form rules. */
function categorise(primary, secondary) {
  const hit = RULES.find(([, re]) => re.test(primary));
  if (hit) return hit[0];
  if (secondary) {
    const hit2 = RULES.find(([k, re]) => !CLAIM_DRIVEN.has(k) && re.test(secondary));
    if (hit2) return hit2[0];
  }
  return 'snacks-sweets';
}
function valuesFor(text) {
  return VALUE_RULES.filter(([, re]) => re.test(text)).map(([k]) => k);
}
/* Pricing is mirrored from each source, never derived.
   `price` is what the store actually charges for its default variant and
   `mrp` is that variant's struck-through compare-at, or 0 when there is no
   discount running. An earlier build showed MRP as the headline and invented
   a wholesale rate at a flat 50% off, which made every figure on the site
   disagree with the brand's own storefront. */
function pricing(price, compareAt) {
  const p = Math.round(+price || 0);
  const c = Math.round(+compareAt || 0);
  const mrp = c > p ? c : 0;
  return { price: p, mrp: mrp, discount: mrp ? Math.round((1 - p / mrp) * 100) : 0 };
}

/* Description text exactly as the source wrote it, tags stripped. */
function plainText(html, cap) {
  const t = decode(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return cap && t.length > cap ? t.slice(0, cap).replace(/\s+\S*$/, '') + '…' : t;
}

/* The supplied CSV is a scrape of Two Brothers' listing page. It carries
   ratings the products.json feed does not, but its size options are links to
   sibling products rather than real variants, and it has no per-size price.
   So: prices and variants come from the feed, ratings come from here, joined
   on the product handle. */
function tbRatings() {
  const rows = parseCSV(fs.readFileSync(path.join(__dirname, '..', 'twobrothersindiashop.csv'), 'utf8'));
  const map = {};
  rows.slice(1).forEach(r => {
    const handle = (r[2] || '').split('/products/')[1];
    if (!handle) return;
    const badge = (r[14] || '').trim();                       // '4.9 | 1631 Reviews'
    map[handle.trim()] = {
      rating:  parseFloat(badge.split('|')[0]) || parseFloat(r[16]) || 0,
      reviews: parseInt((badge.split('|')[1] || '').replace(/[^0-9]/g, ''), 10) || 0,
      badge:   (r[0] || '').trim(),
      usp:     (r[13] || '').trim(),
    };
  });
  return map;
}

/* ================= legacy CSV reader, kept for reference ================= */
function twoBrothersCsv() {
  const rows = parseCSV(fs.readFileSync(path.join(__dirname, '..', 'twobrothersindiashop.csv'), 'utf8'));
  return rows.slice(1).map((r, i) => {
    const title = (r[8] || '').trim().replace(/\s*\|\s*$/, '');
    const mrp   = money(r[11]) || money(r[9]);
    let   usp   = (r[13] || '').trim();
    const badgeTxt = (r[14] || '').trim();              // '4.9 | 1631 Reviews'
    const t = pricing(money(r[9]), money(r[11]));   // sale price, regular price
    return {
      id: 'tb-' + String(i + 1).padStart(3, '0'),
      slug: slug(title) || ('tb-product-' + (i + 1)),
      title,
      usp: usp,                      // the site's own strapline, verbatim
      desc: '',                      // the CSV carries no description
      brandId: 'two-brothers',
      category: categorise(title),
      values: valuesFor(title + ' ' + usp),
      badge: (r[0] || '').trim(),
      price: t.price, mrp: t.mrp, discount: t.discount,
      rating:  parseFloat(badgeTxt.split('|')[0]) || parseFloat(r[16]) || 0,
      reviews: parseInt((badgeTxt.split('|')[1] || '').replace(/[^0-9]/g, ''), 10) || 0,
      sizes: [(r[19] || '').trim(), (r[20] || '').trim()].filter(Boolean),
      img:  (r[3] || '').trim(),
      img2: (r[4] || '').trim(),
      imgs: [(r[3] || '').trim(), (r[4] || '').trim()].filter(Boolean),
    };
  }).filter(p => p.title && p.mrp > 0);
}

/* ================= generic Shopify products.json reader =================
   Every store we have added so far exposes /products.json in the same shape,
   so one reader serves them all. Per-store quirks go in `opt`:
     opt.keep         filter(rawProduct) -> boolean
     opt.stripName    RegExp of brand noise to remove from titles
     opt.title        (cleanTitle, rawProduct) -> string, overrides the default
     opt.usp          (rawProduct, cleanTitle) -> string, overrides the default
     opt.category     (rawProduct, cleanTitle) -> category key, skips RULES
     opt.maker        (rawProduct) -> the label on the pack, when the brand
                      record is a distributor rather than the maker
     opt.allowNoImage keep listings the store published without a photo
     opt.allStock     the feed carries no merch or vouchers, so skip the
                      generic isNotStock filter
   ------------------------------------------------------------------------ */
const decode = s => String(s || '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .replace(/&nbsp;/g, ' ').replace(/&#8211;|&ndash;/g, '–').replace(/&quot;/g, '"');

/* pull the first bullet points out of a Shopify description */
function bullets(html, n) {
  return (String(html || '').match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [])
    .map(s => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 3 && s.length < 80)
    .slice(0, n);
}

/* Split a title on ',' or '|' but only where they sit outside ( ) */
function splitTopLevel(str) {
  const out = []; let buf = '', depth = 0;
  for (const ch of String(str)) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === '|') && depth === 0) { out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  out.push(buf);
  return out.map(s => s.trim()).filter(Boolean);
}

/* Some stores write no bullets at all, so fall back to the opening sentence. */
function firstSentence(html) {
  const txt = decode(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  if (!txt) return '';
  const s = txt.split(/(?<=[.!?])\s+/)[0] || txt;
  return s.length > 78 ? s.slice(0, 75).replace(/\s+\S*$/, '') + '…' : s;
}

/* Shopify serves resized images by filename suffix */
const shrink = u => String(u || '').replace(/(\.(jpg|jpeg|png|webp))(\?|$)/i, '_600x600$1$3');
/* Product-page gallery: every source image, large enough to fill the stage */
const big    = u => String(u || '').replace(/(\.(jpg|jpeg|png|webp))(\?|$)/i, '_1200x1200$1$3');

/* Every image on the site is hotlinked from the source store's own CDN --
   nothing is copied into this repo. A handful of listings were published
   with no photo at all, so those get this drawn-in-place tile rather than a
   borrowed shot of a different product or a broken <img>. */
const NO_IMAGE = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">' +
  '<rect width="300" height="300" fill="#F3EEE6"/>' +
  '<rect x="92" y="112" width="116" height="82" rx="5" fill="none" stroke="#CBBEAA" stroke-width="4"/>' +
  '<circle cx="123" cy="139" r="9" fill="#CBBEAA"/>' +
  '<path d="m100 186 30-31 21 22 19-17 28 26" fill="none" stroke="#CBBEAA" ' +
    'stroke-width="4" stroke-linejoin="round"/>' +
  '<text x="150" y="224" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" ' +
    'font-size="13" fill="#9B8E7B">No photo supplied</text></svg>');

/* Vouchers and merch turn up in most of these feeds — gift cards, tote bags,
   shakers, even a children's picture book. None of it is shelf stock. */
const isNotStock = p => {
  const t = (p.title || '') + ' ' + (p.product_type || '');
  return /gift card|e-?gift|voucher|\bwallet\b/i.test(t) ||
         /merchandise|apparel/i.test(p.product_type || '') ||
         /\btote\b|\bt-?shirt\b|\bmug\b|\bflask\b|\bbook\b|sipper|\bcap\b/i.test(p.title || '');
};

/* ---- The Whole Truth publishes an llmFeed.json instead of products.json ----
   Flat records: {sku, name, description, price, availability, pack_size,
   image_url}. One row per variant, names suffixed "— Option / Value". */
function llmFeedSource(file, brandId, prefix) {
  const feed = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  const base = n => decode(String(n)).replace(/\s*—\s*.*$/, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\s+/g, ' ').trim();

  /* Singles and their own multipacks are separate rows. Group on the name with
     any "- Box of 10" suffix removed, then keep the single if there is one and
     the cheapest pack otherwise — dropping every pack outright would lose the
     lines that are only sold by the box. */
  /* Strip only the pack phrase, not everything after it — ".*$" turned
     "All in One - Box of 8 Protein Bars" into "All in One" and lost the noun
     the taxonomy needs. */
  const core = n => base(n)
    .replace(/\s*[-–]\s*(box|pack) of \d+\s*/i, ' ')
    .replace(/\s+/g, ' ').trim();
  const groups = {};
  (feed.products || []).forEach(p => {
    if (p.availability !== 'InStock' || !p.image_url || !(p.price > 0)) return;
    if (isNotStock({ title: p.name, product_type: '' })) return;
    const k = core(p.name).toLowerCase();
    if (!k) return;
    const isPack = /\b(box|pack) of \d+/i.test(p.name);
    const cur = groups[k];
    if (!cur) { groups[k] = p; return; }
    const curPack = /\b(box|pack) of \d+/i.test(cur.name);
    if (curPack && !isPack) groups[k] = p;                       // single wins
    else if (curPack === isPack && p.price < cur.price) groups[k] = p;
  });

  return Object.values(groups).map((p, i) => {
    const title = core(p.name);
    const t     = pricing(p.price, 0);       // the feed carries no compare-at
    const body  = plainText(p.description);
    return {
      id: prefix + '-' + String(i + 1).padStart(3, '0'),
      slug: slug(title) || (prefix + '-product-' + (i + 1)),
      title,
      usp: firstSentence(p.description) || '',
      desc: plainText(p.description, 700),
      brandId,
      category: categorise(title, body.slice(0, 400)),
      values: valuesFor(title + ' ' + body),
      badge: '',
      price: t.price, mrp: t.mrp, discount: t.discount,
      rating: 0, reviews: 0,
      maker: '',
      /* this feed is one row per option, so a kept row is a single variant */
      variants: [{
        title: /default/i.test(p.pack_size || '') ? '' : String(p.pack_size).trim(),
        price: t.price, mrp: t.mrp, discount: t.discount,
      }],
      img: p.image_url, img2: '', imgs: [p.image_url].filter(Boolean),
    };
  });
}

function shopifySource(file, brandId, prefix, opt) {
  opt = opt || {};
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  return raw.filter(p => (opt.allStock || !isNotStock(p)) && (opt.keep ? opt.keep(p) : true))
    .map((p, i) => {
    const priced = p.variants.filter(v => +v.price > 0);
    if (!priced.length) return null;
    if (!p.images.length && !opt.allowNoImage) return null;

    /* The store's own default variant — first in feed order — so the price
       here is the one a shopper sees on the brand's product page. */
    const v = priced[0];
    const t = pricing(v.price, v.compare_at_price);
    if (!t.price) return null;

    const clean = decode(p.title).replace(opt.stripName || /^$/, '').replace(/\s+/g, ' ').trim();
    /* Split on separators outside brackets: combo titles list their contents
       in parentheses and must not be torn in half. */
    const bits  = splitTopLevel(clean);
    const title = opt.title ? opt.title(clean, p)
                : (bits[0].replace(/\s*[-–]\s*\d+\s*(gms?|kgs?|ml|l)\s*$/i, '').trim() || clean);

    /* Card strapline drawn from the source's own words only — the title's
       trailing clauses, then its bullets, then its opening sentence. No
       invented copy: an empty description stays empty. */
    const usp = opt.usp ? opt.usp(p, clean)
              : (bits.slice(1, 3).join(' | ').replace(/\s+/g, ' ').slice(0, 90) ||
                 bullets(p.body_html, 2).join(' | ').slice(0, 90) ||
                 firstSentence(p.body_html) || '');

    const tags = (p.tags || []).join(' ');
    const badge = /New Arrival/i.test(tags)              ? 'New Launch'
                : /Best Seller|favourite/i.test(tags)    ? 'Best Seller'
                : /Value Pack/i.test(tags + clean)       ? 'Value Pack'
                : /Combo/i.test(p.product_type || '')    ? 'Combo'
                : /Gifting/i.test(p.product_type || '')  ? 'Gifting'
                : '';

    const hay = clean + ' ' + usp + ' ' + plainText(p.body_html);

    const out = {
      id: prefix + '-' + String(i + 1).padStart(3, '0'),
      slug: slug(p.handle) || (prefix + '-product-' + (i + 1)),
      title, usp,
      desc: plainText(p.body_html, 700),     // the brand's own description
      brandId,
      maker: opt.maker ? opt.maker(p) : '',
      category: opt.category ? opt.category(p, clean)
              : categorise(clean + ' ' + (p.product_type || ''),
                           plainText(p.body_html).slice(0, 400)),
      values: valuesFor(hay),
      badge,
      price: t.price, mrp: t.mrp, discount: t.discount,
      rating: 0, reviews: 0,                 // these feeds carry no review data
      /* Every purchasable option with its own price, so picking a size on the
         product page actually moves the figure. Storing only the size names
         was the bug: 500ml and 1000ml showed the same price. */
      variants: priced.slice(0, 8).map(x => {
        const vt = pricing(x.price, x.compare_at_price);
        /* "Default Title" is Shopify's placeholder for a product that has no
           options at all, not a pack size a shop can order. Blank it rather
           than drop it -- the record still needs one variant to price
           against, and the card then prints an empty case-pack slot, the way
           it already does for the CSV rows that never carried a size. */
        const vtitle = /^default title$/i.test(x.title) ? '' : decode(x.title);
        return { title: vtitle, price: vt.price, mrp: vt.mrp, discount: vt.discount };
      }).filter(x => x.title || priced.length === 1),
      img:  p.images.length ? shrink(p.images[0].src) : NO_IMAGE,
      img2: shrink((p.images[1] || {}).src),
      imgs: p.images.slice(0, 10).map(x => big(x.src)),
    };
    return opt.after ? opt.after(out, p) : out;
  }).filter(Boolean);
}

/* ================= assemble ================= */
const TB_META = tbRatings();

const products = shopifySource('tb-raw.json', 'two-brothers', 'tb', {
    stripName: /^Two Brothers\s+/gi,
    /* fold the CSV's ratings and straplines back in, matched on handle */
    after: (out, p) => {
      const m = TB_META[p.handle];
      if (!m) return out;
      out.rating  = m.rating;
      out.reviews = m.reviews;
      if (m.badge) out.badge = m.badge;
      if (m.usp)   out.usp   = m.usp;
      return out;
    },
  })
  .concat(shopifySource('happilo-raw.json', 'happilo', 'hp', {
    stripName: /^Happilo\s+|\s*\|\s*Happilo\s*$/gi,
  }))
  .concat(shopifySource('overra-raw.json', 'overra', 'ov', {
    /* The typed listings are multipacks of the untyped base SKU — clean 2x/4x/5x
       price ratios. Keep the single units; Befach derives its own case packs. */
    keep: p => !p.product_type,
    stripName: /^Overra Herbals\s+/gi,
    /* Keep the pack weight in the name: three SKUs are all "Diabeat Plus Sugar"
       and only the weight tells them apart. */
    title: clean => clean.replace(/\s*[-–]\s*/, ' ').replace(/\s+/g, ' ').trim(),
  }))
  .concat(shopifySource('yogabars-raw.json', 'yogabars', 'yb', {
    stripName: /^Yogabar\s+/gi,
  }))
  .concat(shopifySource('wellbeing-raw.json', 'wellbeing', 'wb', {
    /* memberships and access passes are not stock a shop can put on a shelf */
    keep: p => {
      const t = (p.title || '') + ' ' + (p.product_type || '');
      /* shakers, gym bags, lab tests and freebies are not shelf stock */
      if (/shaker|gym bag|blood test|membership|gift card|subscription|t-shirt/i.test(t)) return false;
      if (/\bsamplers?\b|\bsample\b/i.test(p.title || '')) return false;
      if (/^free\b/i.test((p.title || '').trim())) return false;
      return true;
    },
    stripName: /^Wellbeing Nutrition\s+/gi,
  }))
  .concat(shopifySource('farmley-raw.json', 'farmley', 'fm', {
    stripName: /^Farmley\s+/gi,
  }))
  .concat(shopifySource('rage-raw.json', 'rage', 'rg', {
    /* flasks and mugs are merchandise, not stock */
    keep: p => !/flask|mug|tumbler|frother$/i.test(p.product_type || ''),
    stripName: /^Rage Coffee\s+/gi,
  }))
  .concat(shopifySource('slurrp-raw.json', 'slurrp', 'sl', {
    stripName: /^Slurrp Farm\s+/gi,
  }))
  .concat(shopifySource('conscious-raw.json', 'conscious', 'cf', {
    stripName: /^Conscious Food\s+/gi,
  }))
  .concat(shopifySource('opensecret-raw.json', 'opensecret', 'os', {
    stripName: /^Open Secret\s+/gi,
  }))
  .concat(shopifySource('nourish-raw.json', 'nourish', 'no', {
    stripName: /^Nourish Organics\s+/gi,
  }))
  .concat(llmFeedSource('twt-feed.json', 'wholetruth', 'wt'))
  /* Cococart is a distributor, not a maker: one supplier record, 57 labels on
     the packs. The whole shelf comes across -- no keep filter, and the three
     listings the store published without a photo are kept too, so the count
     here matches the count on cococart.in exactly. */
  .concat(shopifySource('cococart-raw.json', 'cococart', 'cc', {
    allStock: true,        /* confectionery only -- no merch to screen out, and
                              isNotStock's /book/ was eating a Venchi gift pack */
    allowNoImage: true,
    category: cococartCategory,
    maker: p => {
      const v = (p.vendor || '').trim();
      return /^(cococart|gift hampers)$/i.test(v) ? '' : v;    // house-packed
    },
    /* Weight is the only thing separating some listings ("Ballotin Box 250g"
       from "Ballotin Box 500g"), so keep the title whole -- no splitting on
       the comma, no stripping the trailing grammage. Only the maker's name
       comes off the front, since the card prints it on its own line, and it
       stays on when what is left would be a bare weight ("Lotus Biscoff
       225g" -> "225g"). */
    title: (clean, p) => {
      const v = (p.vendor || '').trim();
      if (!v || /^(cococart|gift hampers)$/i.test(v)) return clean;
      if (clean.slice(0, v.length).toLowerCase() !== v.toLowerCase()) return clean;
      const rest = clean.slice(v.length).replace(/^\s*[-–:]\s*/, '').replace(/\s+/g, ' ').trim();
      return /[a-z]{3}/i.test(rest) ? rest : clean;
    },
    usp: p => bullets(p.body_html, 2).join(' | ').slice(0, 90) ||
              firstSentence(p.body_html) || '',
  }));

/* Slugs must stay unique across sources: find() resolves a route by slug, so
   a collision makes one of the pair unreachable. Suffixing the source prefix
   was not enough -- slug() truncates at 60 chars, which collapsed three
   distinct Slurrp handles onto one string that then all took the same '-sl'.
   The full id is unique by construction. */
const seen = {};
products.forEach(p => {
  if (seen[p.slug]) p.slug = p.slug + '-' + p.id;
  seen[p.slug] = 1;
});
const dupes = products.length - new Set(products.map(p => p.slug)).size;
if (dupes) console.log('  !! duplicate slugs after dedup:', dupes);

const categories = Object.entries(CATS).map(([key, meta]) => ({
  key, ...meta, count: products.filter(p => p.category === key).length,
})).filter(c => c.count).sort((a, b) => b.count - a.count);

fs.writeFileSync(path.join(__dirname, 'catalog.json'),
  JSON.stringify({ products, categories }, null, 2));

const bids = [...new Set(products.map(p => p.brandId))];
console.log('products:', products.length, '(' + bids.map(b => b + ' ' + products.filter(p => p.brandId === b).length).join(', ') + ')');
console.log('\ncategory                     total   TB   HP');
categories.forEach(c => {
  const per = bids.map(b => String(
    products.filter(p => p.category === c.key && p.brandId === b).length).padStart(6)).join('');
  console.log('  ' + c.key.padEnd(18), String(c.count).padStart(5) + per, ' ' + c.name);
});
const vt = {}; products.forEach(p => p.values.forEach(v => vt[v] = (vt[v] || 0) + 1));
console.log('\nvalue tags:', vt);
console.log('missing image:', products.filter(p => !p.img).length,
  '| missing mrp:', products.filter(p => !p.mrp).length);
