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
];

/* Illustrative pipeline brands showing marketplace shape. Fictional. */
const pipeline = [
  { id: 'nilgiri-press', name: 'Nilgiri Press',  city: 'Coonoor, TN',   cat: 'Tea & Coffee', accent: '#2F5D50' },
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
];

/* Two Brothers images come from the CSV at 1200px — pull them down to card size. */
cat.products.forEach(p => {
  p.img  = p.img.replace(/_1200x\./, '_600x.');
  p.img2 = p.img2.replace(/_1200x\./, '_600x.');
});

const payload = { products: cat.products, categories: cat.categories, brands, pipeline, values };
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
console.log('  brands    ', brands.length, 'live +', pipeline.length, 'onboarding');
brands.forEach(b => console.log('   ', b.short.padEnd(14),
  cat.products.filter(p => p.brandId === b.id).length, 'products'));
const unknown = cat.products.filter(p => !brands.some(b => b.id === p.brandId));
if (unknown.length) console.log('  !! products with no brand record:', unknown.length);
const badVal = new Set();
cat.products.forEach(p => p.values.forEach(v => { if (!values.some(x => x.key === v)) badVal.add(v); }));
if (badVal.size) console.log('  !! value keys with no record:', [...badVal].join(', '));
