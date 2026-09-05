/* Turns catalog.json into the payload the site loads (docs/assets/data.js). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const cat = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));

/* Live brands. Seed data — replace with real onboarding records. */
const brands = [
  {
    id: 'two-brothers', name: 'Two Brothers Organic Farms', short: 'Two Brothers',
    city: 'Bhodani, Pune', state: 'Maharashtra', since: 2014,
    tagline: 'Regenerative farm-to-shelf staples from the Deccan plateau',
    story: 'A working family farm in Bhodani village that went back to bullocks, native seed and ' +
           'cow-based inputs. Everything is grown or sourced within a day of the farm, stone-ground ' +
           'or bilona-churned in small batches, and third-party tested to be glyphosate-free.',
    values: ['organic', 'small-batch', 'native-seed'],
    openingMin: 10000, reorderMin: 5000, leadDays: '4-6', shipsFrom: 'Pune, MH',
    prep: 'FSSAI licensed · Glyphosate-free certified · Single-farm traceability',
    accent: '#3F6B4A',
  },
  {
    id: 'happilo', name: 'Happilo', short: 'Happilo',
    city: 'Bengaluru', state: 'Karnataka', since: 2016,
    tagline: 'Premium dry fruit, nuts and everyday healthy snacking',
    story: 'A Bengaluru packer built around consistent grading. Californian and Kashmiri nuts, ' +
           'Gulf-origin dates and Indian makhana are sorted, roasted and packed to a fixed spec, ' +
           'so a case opened in Kochi matches one opened in Kanpur. The range runs from bulk ' +
           'kernels to single-serve snack packs and festive hampers.',
    values: ['organic', 'superfood', 'high-protein'],
    openingMin: 15000, reorderMin: 7500, leadDays: '3-5', shipsFrom: 'Bengaluru, KA',
    prep: 'FSSAI licensed · Graded and packed in-house · Pan-India distribution',
    accent: '#B7412C',
  },
  {
    id: 'overra', name: 'Overra Herbals', short: 'Overra',
    city: 'Bathinda', state: 'Punjab',
    tagline: 'Low-GI staples for diabetic and pre-diabetic households',
    story: 'A single-category specialist working on one problem: the Indian kitchen ' +
           'staples a diabetic household cannot easily replace. Cane sugar, jaggery ' +
           'powder, rice, atta and a herbal tea, each reformulated to a low glycaemic ' +
           'index and made at their own plant in Bathinda. A narrow range, but one ' +
           'no general grocery brand covers.',
    values: ['low-gi', 'gluten-free', 'no-refined'],
    openingMin: 8000, reorderMin: 4000, leadDays: '5-7', shipsFrom: 'Bathinda, PB',
    prep: 'FSSAI licensed · Own manufacturing unit · Sales office in New Delhi',
    accent: '#25406B',
  },
  {
    id: 'yogabars', name: 'Yogabar', short: 'Yogabar',
    city: 'Bengaluru', state: 'Karnataka', since: 2014,
    tagline: 'Protein bars, muesli and breakfast for people who read labels',
    story: 'Built on the bet that Indian shoppers would pay for a snack bar with a ' +
           'readable ingredient list. The range starts at protein and muesli bars and ' +
           'now runs through rolled oats, dark-chocolate muesli and whey. Fast-moving, ' +
           'single-serve, and priced for impulse — the sort of stock that turns over ' +
           'at a counter rather than sitting on a shelf.',
    values: ['high-protein', 'no-refined', 'vegan'],
    openingMin: 12000, reorderMin: 6000, leadDays: '3-5', shipsFrom: 'Bengaluru, KA',
    prep: 'FSSAI licensed · Modern trade and q-commerce listed · Pan-India',
    accent: '#C0562A',
  },
  {
    id: 'wellbeing', name: 'Wellbeing Nutrition', short: 'Wellbeing',
    city: 'Mumbai', state: 'Maharashtra', since: 2019,
    tagline: 'Clinically formulated supplements in formats people actually finish',
    story: 'A supplements house that competes on delivery format as much as on the ' +
           'actives — oral thin strips that dissolve on the tongue, slow-release ' +
           'capsules, effervescents and marine collagen. The widest range on Befach ' +
           'by some distance, and the one that needs a pharmacist-style conversation ' +
           'at the counter rather than a shelf tag.',
    values: ['superfood', 'high-protein', 'vegan'],
    openingMin: 20000, reorderMin: 10000, leadDays: '4-6', shipsFrom: 'Mumbai, MH',
    prep: 'FSSAI licensed · Third-party lab tested · Clinically formulated range',
    accent: '#2F5D50',
  },
  {
    id: 'farmley', name: 'Farmley', short: 'Farmley',
    city: 'Noida', state: 'Uttar Pradesh', since: 2017,
    tagline: 'Dates, seeds and roasted makhana, packed for modern retail',
    story: 'Started in dry fruit sourcing and moved up the chain into branded snacking. ' +
           'Date bites, flavoured roasted makhana and seed mixes, built for the shelf ' +
           'rather than the sack — consistent grammage, printed dates, retail-ready ' +
           'cartons. Useful stock for a shop that wants dry fruit without running a ' +
           'weighing scale.',
    values: ['no-refined', 'superfood', 'high-protein'],
    openingMin: 10000, reorderMin: 5000, leadDays: '4-6', shipsFrom: 'Noida, UP',
    prep: 'FSSAI licensed · Retail-ready packaging · Pan-India distribution',
    accent: '#7A5C9E',
  },
  {
    id: 'wholetruth', name: 'The Whole Truth Foods', short: 'Whole Truth',
    city: 'Bengaluru', state: 'Karnataka', since: 2019,
    tagline: 'Protein bars and cocoa with the full ingredient list on the front',
    story: 'Built the brand around printing the entire ingredient list on the front ' +
           'of the pack, in full, with nothing hidden behind "natural flavours". ' +
           'Date-sweetened protein bars, dark cocoa and nut butters. Sells to people ' +
           'who read labels, which makes it easy stock to explain across a counter.',
    values: ['no-refined', 'high-protein', 'organic'],
    openingMin: 12000, reorderMin: 6000, leadDays: '4-6', shipsFrom: 'Bengaluru, KA',
    prep: 'FSSAI licensed · Full ingredient disclosure · No added sugar range',
    accent: '#1F1B18',
  },
  {
    id: 'rage', name: 'Rage Coffee', short: 'Rage',
    city: 'New Delhi', state: 'Delhi', since: 2018,
    tagline: 'Plant-vitamin instant coffee in flavours that move at a counter',
    story: 'Instant coffee treated as an impulse category rather than a pantry one — ' +
           'flavoured blends fortified with plant vitamins, in sachets and small jars. ' +
           'High rotation, small footprint, and the sort of thing a cafe or a corner ' +
           'store can stock without committing shelf depth.',
    values: ['vegan', 'no-refined'],
    openingMin: 8000, reorderMin: 4000, leadDays: '3-5', shipsFrom: 'New Delhi, DL',
    prep: 'FSSAI licensed · Sachet and jar formats · Pan-India distribution',
    accent: '#6B3FA0',
  },
  {
    id: 'slurrp', name: 'Slurrp Farm', short: 'Slurrp Farm',
    city: 'Gurugram', state: 'Haryana', since: 2016,
    tagline: 'Millet-first food for children, made to survive a fussy eater',
    story: 'Ragi, jowar and bajra rebuilt into the shapes children will actually eat — ' +
           'pancake mixes, dosa batter, cookies, noodles and instant cereal. Aimed at ' +
           'parents who want the millet without the argument. Strong repeat rates and ' +
           'a clear shelf story for any shop with a kids section.',
    values: ['organic', 'no-refined', 'gluten-free'],
    openingMin: 10000, reorderMin: 5000, leadDays: '4-6', shipsFrom: 'Gurugram, HR',
    prep: 'FSSAI licensed · Millet-based range · No refined flour or sugar',
    accent: '#3F6B4A',
  },
  {
    id: 'conscious', name: 'Conscious Food', short: 'Conscious Food',
    city: 'Mumbai', state: 'Maharashtra', since: 1990,
    tagline: 'One of India’s oldest organic pantry brands',
    story: 'Working with organic farmer groups since 1990, long before the category had ' +
           'a name in India. The widest pantry range on Befach — pulses, flours, ' +
           'cold-pressed oils, whole spices, rice and sweeteners. The brand a shop ' +
           'stocks when it wants one supplier for the whole organic aisle.',
    values: ['organic', 'native-seed', 'cold-pressed'],
    openingMin: 12000, reorderMin: 6000, leadDays: '5-7', shipsFrom: 'Mumbai, MH',
    prep: 'FSSAI licensed · Certified organic range · Farmer-group sourcing',
    accent: '#5A7A3F',
  },
  {
    id: 'opensecret', name: 'Open Secret', short: 'Open Secret',
    city: 'Mumbai', state: 'Maharashtra', since: 2019,
    tagline: 'Nut-based cookies and chips, junk food rebuilt from the inside',
    story: 'Takes the snacks children already want — cookies, chips, namkeen — and ' +
           'rebuilds them on a nut base instead of refined flour. Calls it "unjunking". ' +
           'Sits between the biscuit aisle and the health aisle, which is a useful ' +
           'place to be for a shop that serves both.',
    values: ['no-refined', 'high-protein', 'gluten-free'],
    openingMin: 10000, reorderMin: 5000, leadDays: '3-5', shipsFrom: 'Mumbai, MH',
    prep: 'FSSAI licensed · Nut-based formulations · No maida or palm oil',
    accent: '#C0562A',
  },
  {
    id: 'nourish', name: 'Nourish Organics', short: 'Nourish',
    city: 'New Delhi', state: 'Delhi', since: 2010,
    tagline: 'Granola, puffs and clean-label snacking since 2010',
    story: 'One of the earlier entrants in Indian clean-label snacking — granola, ' +
           'protein puffs, seed bars and popped snacks, most of it gluten-free and ' +
           'sweetened with dates or jaggery. A compact, fast-moving range that fills ' +
           'the impulse shelf without much SKU management.',
    values: ['organic', 'gluten-free', 'vegan'],
    openingMin: 8000, reorderMin: 4000, leadDays: '4-6', shipsFrom: 'New Delhi, DL',
    prep: 'FSSAI licensed · Gluten-free facility · Date and jaggery sweetened',
    accent: '#C08A2E',
  },
  {
    id: 'cococart', name: 'Cococart', short: 'Cococart',
    city: 'Turbhe, Navi Mumbai', state: 'Maharashtra', since: 2022,
    tagline: 'Imported and Indian chocolate, 57 labels off one invoice',
    story: 'The only distributor on Befach rather than a maker. Cococart imports and ' +
           'stocks the chocolate aisle whole — Belgian pralines from Neuhaus and ' +
           'Godiva, Italian dragees from Venchi, Swiss and German bars, Rhine Valley, ' +
           'Cadbury and Fabelle — and delivers it out of Navi Mumbai to Mumbai, ' +
           'Delhi, Bengaluru and Kolkata. A shop that would otherwise open accounts ' +
           'with fifty importers opens one.',
    /* No value badge fits an importer of Belgian pralines, and inventing one
       would put a claim on the pack that the pack does not make. */
    values: [],
    storyHead: 'The supplier',
    openingMin: 25000, reorderMin: 12000, leadDays: '3-5', shipsFrom: 'Navi Mumbai, MH',
    prep: 'FSSAI licensed · Temperature-controlled storage · 57 labels stocked',
    accent: '#6B4226',
  },
];

/* Illustrative pipeline brands showing marketplace shape. Fictional. */
const pipeline = [
  { id: 'kutch-clay',    name: 'Kutch Clay Co.', city: 'Bhuj, GJ',      cat: 'Home & Table', accent: '#B7412C' },
  { id: 'aranya-soap',   name: 'Aranya Botanics',city: 'Kochi, KL',     cat: 'Bath & Body',  accent: '#7A5C9E' },
  { id: 'chanderi-loom', name: 'Chanderi Loom',  city: 'Chanderi, MP',  cat: 'Textiles',     accent: '#25406B' },
  { id: 'attar-house',   name: 'The Attar House',city: 'Kannauj, UP',   cat: 'Fragrance',    accent: '#C08A2E' },
  { id: 'bastar-iron',   name: 'Bastar Ironwork',city: 'Jagdalpur, CG', cat: 'Decor',        accent: '#5A5147' },
];

const values = [
  { key: 'organic',      label: 'Chemical-free',      hi: 'शुद्ध',      desc: 'No additives or preservatives' },
  { key: 'low-gi',       label: 'Low GI',             hi: 'लो जी.आई',   desc: 'Low glycaemic index, diabetic friendly' },
  { key: 'superfood',    label: 'Superfood',          hi: 'सुपरफूड',    desc: 'Omega-3, antioxidant and micronutrient dense' },
  { key: 'high-protein', label: 'Protein & fibre',    hi: 'पौष्टिक',    desc: 'Nutrient-dense by formulation' },
  { key: 'native-seed',  label: 'Native variety',     hi: 'देसी',       desc: 'Heirloom and single-origin stock' },
  { key: 'no-refined',   label: 'No refined sugar',   hi: 'बिना चीनी',  desc: 'Jaggery, dates or unsweetened' },
  { key: 'gluten-free',  label: 'Gluten-free',        hi: 'ग्लूटन रहित', desc: 'Millet, nut and seed based' },
  { key: 'cold-pressed', label: 'Traditionally made', hi: 'पारंपरिक',   desc: 'Stone-ground, wood-pressed, bilona' },
  { key: 'small-batch',  label: 'Small batch',        hi: 'हस्तनिर्मित', desc: 'Made by hand, in limited runs' },
  { key: 'vegan',        label: 'Vegan',              hi: 'शाकाहारी',   desc: 'No dairy or animal-derived ingredients' },
];

/* Two Brothers images come from the CSV at 1200px — pull them down to card size. */
cat.products.forEach(p => {
  p.img  = p.img.replace(/_1200x\./, '_600x.');
  p.img2 = p.img2.replace(/_1200x\./, '_600x.');
});

/* ================= what the shop front shows =================
   Everything seeded before the confectionery range stays in the payload but
   is flagged hidden, and the client renders only unhidden brands and their
   products. Nothing is deleted: clear the flag on a record and it comes
   straight back, counts and all. */
brands.forEach(b => { b.hidden = true; });
pipeline.forEach(b => { b.hidden = true; });

/* ---- the labels become the brands ----
   The distributor does not make what it sells, so its listings carry other
   companies' labels. Those labels are the brands the shop front shows, which
   is also why the distributor is named nowhere in the payload's copy. */
const LABEL_ALIAS = {                    // one company, two spellings in the feed
  'Maltesers':          'Malteser',
  'St. Michel':         'St Michel',
  "Werther's":         "Werther's Original",
  'Werthers':           "Werther's Original",
  'Cavendish & Harvey': 'Cavendish',
  'Cococart India':     'Gift Hampers',  // house packaging, filed with the hampers
};
const ACCENTS = ['#6B4226', '#1B3A5C', '#B7412C', '#3F6B4A', '#7A5C9E',
                 '#C08A2E', '#25406B', '#5A7A3F', '#C0562A', '#2F5D50'];

const idOf = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '').slice(0, 40);
const mode = xs => {                     // most common value, ties broken by first seen
  const n = {};
  xs.forEach(x => { n[x] = (n[x] || 0) + 1; });
  return Object.keys(n).sort((a, b) => n[b] - n[a])[0] || '';
};
const CAT_NAME = {};
cat.categories.forEach(c => { CAT_NAME[c.key] = c.name; });

const groups = {};
cat.products.filter(p => p.brandId === 'cococart').forEach(p => {
  const label = LABEL_ALIAS[p.maker] || p.maker || 'Gift Hampers';
  (groups[label] = groups[label] || []).push(p);
});

/* Biggest range first, so the two home-page spotlights land on labels with
   something to show rather than on whichever one sorts first. */
const labelBrands = Object.keys(groups)
  .sort((a, b) => groups[b].length - groups[a].length || a.localeCompare(b))
  .map((name, i) => {
    const mine   = groups[name];
    const id     = idOf(name);
    const origin = mode(mine.map(p => p.origin).filter(Boolean));
    const topCat = CAT_NAME[mode(mine.map(p => p.category))] || 'Chocolate';
    /* The label is the brand now, so the per-product maker line would just
       repeat the brand link above it. */
    mine.forEach(p => { p.brandId = id; p.maker = ''; });
    return {
      id, name, short: name, origin,
      tagline: origin ? topCat + ' from ' + origin : topCat,
      story: '',                         // no invented history for a real company
      values: [],                        // and no claims it has not made
      openingMin: 5000, leadDays: '3-5', shipsFrom: 'Navi Mumbai, MH',
      prep: (origin === 'India' ? 'Made in India' : 'Imported stock') +
            ' · FSSAI licensed · Temperature-controlled storage',
      accent: ACCENTS[i % ACCENTS.length],
    };
  });

/* The distributor writes its own name into the hamper copy it publishes. */
cat.products.forEach(p => {
  p.desc = p.desc.replace(/coco\s*cart(?:'|\u2019)s\b/gi, 'our')
                 .replace(/coco\s*cart/gi, 'the supplier');
});

const allBrands = brands.concat(labelBrands);
const payload = { products: cat.products, categories: cat.categories,
                  brands: allBrands, pipeline, values };
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'assets', 'data.js'),
  'window.BEFACH = ' + JSON.stringify(payload) + ';\n');

/* Cache-busting.
   index.html revalidates often but the assets do not, so a returning visitor
   can end up pairing new markup with a stale data.js — which is exactly how
   the Haat -> Befach rename produced a page with zero products. Stamping a
   content hash on each asset URL makes a changed file a different URL. */
const stamp = f => crypto.createHash('sha1')
  .update(fs.readFileSync(path.join(__dirname, '..', 'docs', 'assets', f)))
  .digest('hex').slice(0, 8);

const idxPath = path.join(__dirname, '..', 'docs', 'index.html');
let idx = fs.readFileSync(idxPath, 'utf8');
['styles.css', 'data.js', 'app.js'].forEach(f => {
  const re = new RegExp('(assets/' + f.replace('.', '\\.') + ')(\\?v=[a-f0-9]+)?', 'g');
  idx = idx.replace(re, '$1?v=' + stamp(f));
});
fs.writeFileSync(idxPath, idx);

console.log('wrote docs/assets/data.js');
console.log('  asset versions', ['styles.css', 'data.js', 'app.js']
  .map(f => f.split('.')[0] + '=' + stamp(f)).join(' '));
console.log('  products  ', cat.products.length);
console.log('  categories', cat.categories.length);
const shown  = allBrands.filter(b => !b.hidden);
const hidden = allBrands.filter(b => b.hidden);
const count  = b => cat.products.filter(p => p.brandId === b.id).length;
console.log('  brands    ', shown.length, 'shown +', hidden.length, 'hidden +',
  pipeline.length, 'onboarding (hidden)');
console.log('  on the shop front', shown.reduce((n, b) => n + count(b), 0), 'products:');
shown.forEach(b => console.log('    ', b.short.padEnd(22), String(count(b)).padStart(3),
  b.origin ? '· ' + b.origin : ''));
console.log('  hidden, still in the payload:',
  hidden.map(b => b.short + ' ' + count(b)).join(', '));
const unknown = cat.products.filter(p => !allBrands.some(b => b.id === p.brandId));
if (unknown.length) console.log('  !! products with no brand record:', unknown.length);
const orphan = shown.filter(b => !count(b));
if (orphan.length) console.log('  !! shown brands with no products:', orphan.map(b => b.id).join(', '));
const badVal = new Set();
cat.products.forEach(p => p.values.forEach(v => { if (!values.some(x => x.key === v)) badVal.add(v); }));
if (badVal.size) console.log('  !! value keys with no record:', [...badVal].join(', '));
