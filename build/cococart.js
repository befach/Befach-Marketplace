/* Scrape the full cococart.in catalogue from Shopify's products.json.
   Usage: node build/cococart.js   ->  build/cococart-raw.json */
const fs = require('fs'), path = require('path'), { get } = require('./scrape.js');

(async () => {
  const all = [], seen = new Set();
  for (let page = 1; page <= 60; page++) {
    let j;
    for (let tries = 0; ; tries++) {
      try { j = JSON.parse(await get('https://cococart.in/products.json?limit=250&page=' + page)); break; }
      catch (e) { if (tries >= 3) throw e; await new Promise(r => setTimeout(r, 1200 * (tries + 1))); }
    }
    if (!j.products.length) break;
    j.products.forEach(p => { if (!seen.has(p.id)) { seen.add(p.id); all.push(p); } });
    process.stdout.write('\rpage ' + page + ' → ' + all.length + ' products');
  }
  console.log('');
  fs.writeFileSync(path.join(__dirname, 'cococart-raw.json'), JSON.stringify(all));
  const live = all.filter(p => p.variants.some(v => +v.price > 0) && p.images.length);
  console.log('total', all.length, '· with price+image', live.length);
  const types = {}, vendors = {};
  all.forEach(p => { types[p.product_type || '(none)'] = (types[p.product_type || '(none)'] || 0) + 1;
                     vendors[p.vendor || '(none)'] = (vendors[p.vendor || '(none)'] || 0) + 1; });
  console.log('\nproduct_type:');
  Object.entries(types).sort((a,b)=>b[1]-a[1]).slice(0,40).forEach(([k,v])=>console.log('  '+String(v).padStart(4),k));
  console.log('\nvendors:', Object.keys(vendors).length);
  Object.entries(vendors).sort((a,b)=>b[1]-a[1]).slice(0,40).forEach(([k,v])=>console.log('  '+String(v).padStart(4),k));
})();
