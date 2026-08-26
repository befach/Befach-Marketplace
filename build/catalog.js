/* ------------------------------------------------------------------
   Builds catalog.json from every seeded source.
     - Two Brothers Organic Farms  <- twobrothersindiashop.csv
     - Happilo                     <- happilo-raw.json (Shopify products.json)
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
};

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
  ['vegan',        /vegan|plant-based|plant based|dairy-free|dairy free/i],
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
/* keystone margin, the Faire standard; case packs scale by price band */
function trade(mrp) {
  return {
    wholesale: Math.round(mrp * 0.5 / 5) * 5,
    casePack:  mrp > 1500 ? 4 : mrp > 600 ? 6 : mrp > 200 ? 12 : 24,
  };
}

/* ================= source 1: Two Brothers CSV ================= */
function twoBrothers() {
  const rows = parseCSV(fs.readFileSync(path.join(__dirname, '..', 'twobrothersindiashop.csv'), 'utf8'));
  return rows.slice(1).map((r, i) => {
    const title = (r[8] || '').trim().replace(/\s*\|\s*$/, '');
    const mrp   = money(r[11]) || money(r[9]);
    let   usp   = (r[13] || '').trim();
    const badgeTxt = (r[14] || '').trim();              // '4.9 | 1631 Reviews'
    const t = trade(mrp);
    return {
      id: 'tb-' + String(i + 1).padStart(3, '0'),
      slug: slug(title) || ('tb-product-' + (i + 1)),
      title,
      usp: usp || 'Sourced, milled and packed on the farm',
      brandId: 'two-brothers',
      category: categorise(title),
      values: valuesFor(title + ' ' + usp),
      badge: (r[0] || '').trim(),
      mrp, wholesale: t.wholesale, casePack: t.casePack,
      margin: mrp ? Math.round((1 - t.wholesale / mrp) * 100) : 50,
      rating:  parseFloat(badgeTxt.split('|')[0]) || parseFloat(r[16]) || 0,
      reviews: parseInt((badgeTxt.split('|')[1] || '').replace(/[^0-9]/g, ''), 10) || 0,
      sizes: [(r[19] || '').trim(), (r[20] || '').trim()].filter(Boolean),
      img:  (r[3] || '').trim(),
      img2: (r[4] || '').trim(),
    };
  }).filter(p => p.title && p.mrp > 0);
}

/* ================= generic Shopify products.json reader =================
   Every store we have added so far exposes /products.json in the same shape,
   so one reader serves them all. Per-store quirks go in `opt`:
     opt.keep       filter(rawProduct) -> boolean
     opt.stripName  RegExp of brand noise to remove from titles
     opt.title      (cleanTitle) -> string, overrides the default title cleanup
     opt.usp        (rawProduct, cleanTitle) -> string, overrides the default
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
const shrink = u => String(u || '').replace(/(\.(jpg|jpeg|png|webp))(\?|$)/i, '_300x300$1$3');

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
    const mrp   = Math.round(p.price);
    const t     = trade(mrp);
    const body  = decode(String(p.description || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    return {
      id: prefix + '-' + String(i + 1).padStart(3, '0'),
      slug: slug(title) || (prefix + '-product-' + (i + 1)),
      title,
      usp: firstSentence(p.description) || 'Clean-label, no added nonsense',
      brandId,
      category: categorise(title, body.slice(0, 400)),
      values: valuesFor(title + ' ' + body),
      badge: '',
      mrp, wholesale: t.wholesale, casePack: t.casePack,
      margin: Math.round((1 - t.wholesale / mrp) * 100),
      rating: 0, reviews: 0,
      sizes: /default/i.test(p.pack_size || '') ? [] : [String(p.pack_size).trim()],
      img: p.image_url, img2: '',
    };
  });
}

function shopifySource(file, brandId, prefix, opt) {
  opt = opt || {};
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  return raw.filter(p => !isNotStock(p) && (opt.keep ? opt.keep(p) : true)).map((p, i) => {
    const priced = p.variants.filter(v => +v.price > 0);
    if (!priced.length || !p.images.length) return null;

    /* Anchor on the CHEAPEST priced variant — the base unit.
       These stores sell multipacks as variants ("Pack of 1" ... "Pack of 6",
       "500g x 3"), so taking the dearest one would list a 989-rupee product
       at 5935 and halve that into a nonsense wholesale rate. Retailers buy
       cases of the base SKU; trade() derives the case pack from there. */
    const v   = priced.slice().sort((a, b) => +a.price - +b.price)[0];
    const mrp = Math.round(+(v.compare_at_price && +v.compare_at_price > +v.price
                             ? v.compare_at_price : v.price));
    if (!mrp) return null;

    const clean = decode(p.title).replace(opt.stripName || /^$/, '').replace(/\s+/g, ' ').trim();
    /* Split on separators outside brackets: combo titles list their contents
       in parentheses and must not be torn in half. */
    const bits  = splitTopLevel(clean);
    const title = opt.title ? opt.title(clean)
                : (bits[0].replace(/\s*[-–]\s*\d+\s*(gms?|kgs?|ml|l)\s*$/i, '').trim() || clean);

    const usp = (opt.usp && opt.usp(p, clean)) ||
                bits.slice(1, 3).join(' | ').replace(/\s+/g, ' ').slice(0, 72) ||
                bullets(p.body_html, 2).join(' | ').slice(0, 72) ||
                firstSentence(p.body_html) ||
                (p.product_type ? p.product_type + ' · premium grade' : 'Premium grade, sorted by hand');

    const tags = (p.tags || []).join(' ');
    const badge = /New Arrival/i.test(tags)              ? 'New Launch'
                : /Best Seller|favourite/i.test(tags)    ? 'Best Seller'
                : /Value Pack/i.test(tags + clean)       ? 'Value Pack'
                : /Combo/i.test(p.product_type || '')    ? 'Combo'
                : /Gifting/i.test(p.product_type || '')  ? 'Gifting'
                : '';

    const t = trade(mrp);
    const hay = clean + ' ' + usp + ' ' + decode(p.body_html || '').replace(/<[^>]+>/g, ' ');

    return {
      id: prefix + '-' + String(i + 1).padStart(3, '0'),
      slug: slug(p.handle) || (prefix + '-product-' + (i + 1)),
      title, usp,
      brandId,
      category: categorise(clean + ' ' + (p.product_type || ''),
                           decode(p.body_html || '').replace(/<[^>]+>/g, ' ').slice(0, 400)),
      values: valuesFor(hay),
      badge,
      mrp, wholesale: t.wholesale, casePack: t.casePack,
      margin: Math.round((1 - t.wholesale / mrp) * 100),
      rating: 0, reviews: 0,                 // these feeds carry no review data
      /* Real sizes only — "Pack of 4" and "500g x 3" are multipacks of the
         base unit, not options a retailer picks between. */
      sizes: (function () {
        const all = priced.map(x => decode(x.title))
          .filter(s => s && !/^default title$/i.test(s));
        const real = all.filter(s => !/pack of|\bx\s*\d|\bpk\b/i.test(s));
        return (real.length ? real : all).slice(0, 2);
      }()),
      img:  shrink((p.images[0] || {}).src),
      img2: shrink((p.images[1] || {}).src),
    };
  }).filter(Boolean);
}

/* ================= assemble ================= */
const products = twoBrothers()
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
    /* Their descriptions are the same boilerplate paragraph on every product,
       so the shelf line comes from the range's own positioning instead. */
    usp: (p, clean) =>
        /gluten\s*free/i.test(clean)      ? 'Gluten-free | Low GI, diabetic friendly'
      : /combo|\(\s*\d+\s*pack/i.test(clean) ? 'Low GI staples bundle | Diabetic friendly'
      : /tea/i.test(clean)                ? 'Herbal infusion | Low GI, no added sugar'
      : /rice/i.test(clean)               ? 'Low GI rice | Diabetic friendly'
      : /flour|atta/i.test(clean)         ? 'Low GI flour | Diabetic friendly'
      : /shakkar|shakker|jaggery/i.test(clean) ? 'Low GI jaggery powder | Diabetic friendly'
      : 'Glycaemic index under 45 | Diabetic friendly',
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
  .concat(llmFeedSource('twt-feed.json', 'wholetruth', 'wt'));

// slugs must stay unique across sources
const seen = {};
products.forEach(p => {
  if (seen[p.slug]) p.slug = p.slug + '-' + p.id.split('-')[0];
  seen[p.slug] = 1;
});

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
