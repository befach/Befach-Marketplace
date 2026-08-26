/* Pulls the Overra Herbals catalogue from its public Shopify feed.
   Writes build/overra-raw.json for build/catalog.js to read. */
const fs = require('fs'), path = require('path'), https = require('https');

function get(url, n) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, r => {
      if ([301, 302, 307, 308].includes(r.statusCode) && r.headers.location && (n || 0) < 3) {
        r.resume(); return get(r.headers.location, (n || 0) + 1).then(res, rej);
      }
      if (r.statusCode !== 200) { r.resume(); return rej(new Error(r.statusCode + ' ' + url)); }
      let s = ''; r.setEncoding('utf8');
      r.on('data', d => s += d); r.on('end', () => res(s));
    }).on('error', rej);
  });
}

(async () => {
  const all = [];
  for (let page = 1; page <= 8; page++) {
    const j = JSON.parse(await get('https://overraherbals.com/products.json?limit=250&page=' + page));
    if (!j.products.length) break;
    all.push(...j.products);
  }
  fs.writeFileSync(path.join(__dirname, 'overra-raw.json'), JSON.stringify(all));

  const typed = all.filter(p => p.product_type).length;
  console.log('products:', all.length);
  console.log('typed:', typed, '· untyped:', all.length - typed);
  console.log('\nListings that carry a product_type are multipacks of the untyped');
  console.log('base SKU (clean 2x/4x/5x price ratios). build/catalog.js keeps the');
  console.log('single units only, and derives its own wholesale case packs.');
})();
