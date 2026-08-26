/* Generic Shopify products.json scraper.
   Usage: node build/scrape.js <domain> <outfile>
   The per-brand wrappers (happilo.js, overra.js) call the same endpoint. */
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

async function scrape(domain, outfile) {
  const all = [];
  for (let page = 1; page <= 12; page++) {
    const j = JSON.parse(await get('https://' + domain + '/products.json?limit=250&page=' + page));
    if (!j.products.length) break;
    all.push(...j.products);
  }
  fs.writeFileSync(path.join(__dirname, outfile), JSON.stringify(all));
  const live = all.filter(p => p.variants.some(v => +v.price > 0) && p.images.length);
  console.log(domain.padEnd(26), 'total', String(all.length).padStart(4),
              '· live', String(live.length).padStart(4), '->', outfile);
  return all;
}

module.exports = { scrape, get };

if (require.main === module) {
  const [domain, out] = process.argv.slice(2);
  if (!domain || !out) { console.error('usage: node build/scrape.js <domain> <outfile>'); process.exit(1); }
  scrape(domain, out).catch(e => { console.error('FAILED', domain, e.message); process.exit(1); });
}
