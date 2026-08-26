/* Bundles the site into one self-contained HTML file.
   Product photos are inlined as data URIs because the Artifact CSP
   blocks every external host except Google Fonts. */
const fs = require('fs'), path = require('path');
const R   = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const IMG = path.join(__dirname, 'img-opt');

/* the generated site payload is already the shape the app expects */
const payload = JSON.parse(R('docs/assets/data.js')
  .replace(/^window\.BEFACH = /, '').replace(/;\s*$/, ''));

let bytes = 0, missing = [];
payload.products.forEach(p => {
  const f = path.join(IMG, p.id + '.jpg');
  if (!fs.existsSync(f)) { missing.push(p.id); p.img = ''; p.img2 = ''; return; }
  const b = fs.readFileSync(f); bytes += b.length;
  p.img  = 'data:image/jpeg;base64,' + b.toString('base64');
  p.img2 = '';                       // hover frames would double the page weight
});

const body = R('docs/index.html').split('<body>')[1].split('</body>')[0]
  .replace(/<script src="[^"]*"><\/script>/g, '');

const out = `<title>Befach Wholesale</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&family=Tiro+Devanagari+Hindi&display=swap" rel="stylesheet">
<style>
${R('docs/assets/styles.css')}
</style>
${body}
<script>window.BEFACH = ${JSON.stringify(payload)};</script>
<script>
${R('docs/assets/app.js')}
</script>
`;

const dest = path.join(__dirname, '..', 'befach-artifact.html');
fs.writeFileSync(dest, out);

console.log('products ', payload.products.length, '· brands', payload.brands.length,
            '· categories', payload.categories.length);
console.log('images   ', (bytes / 1048576).toFixed(2), 'MB inlined',
            missing.length ? '(MISSING ' + missing.length + ')' : '');
console.log('artifact ', (fs.statSync(dest).size / 1048576).toFixed(2), 'MB');
if (missing.length) console.log('missing:', missing.join(', '));
