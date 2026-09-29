/* Befach — receives orders, signups and brand enquiries from the shop front.
   Deployed as a web app: Execute as Me, Who has access: Anyone.
   Every edit needs Deploy > Manage deployments > pencil > New version.

   This file is the copy kept in the repo (apps-script/Code.gs). The live one is
   the script bound to the "Befach — orders & queries" sheet; paste this over it
   when it changes here. */

const SECRET = 'QBTO0I8PX3p_WBpJKYZK1syvO_RRGKVz';
const LOGO_FOLDER = 'Befach brand logos';

/* Column order is the contract with app.js: rows are written positionally, so a
   column added in the middle shifts every row written before it. Append new
   ones at the end unless the tab is empty. */
const ORDER_COLS = ['Received','Order','Placed','Status','Shop','Phone','City','GSTIN',
  'Shop type','Brand','Origin','Product','Category','Pack','Unit price','MRP','Qty',
  'Line total','Order subtotal','GST','Freight','Order total','Delivery address'];
const LEAD_COLS  = ['Received','Shop','Phone','City','GSTIN','Shop type','Page','Message'];
const BRAND_COLS = ['Received','Brand','Country','Category','Contact','Phone','Email',
  'Website','Message','Logo','Page'];
/* Anything that could not be written where it belongs lands here whole, so a
   broken tab costs a manual copy, never a customer. */
const FAILED_COLS = ['Received','Kind','Error','Shop / brand','Phone','Data (JSON)'];

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'befach', post: 'required' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  const say = o => out.setContent(JSON.stringify(o));
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return say({ ok: false, error: 'bad json' });
  }
  if (body.secret !== SECRET) return say({ ok: false, error: 'auth' });
  if (['order', 'lead', 'brand'].indexOf(body.kind) < 0) return say({ ok: false, error: 'unknown kind' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      if (body.kind === 'order')      appendOrder(ss, body.order);
      else if (body.kind === 'lead')  appendLead(ss, body.lead);
      else                            appendBrand(ss, body.brand);
    } finally {
      lock.releaseLock();
    }
    return say({ ok: true });
  } catch (err) {
    /* It used to reply ok:false here, and the shop kept the item and retried it
       forever. From 18 September a Leads tab made into a table refused every
       signup that way, and each one sat in its buyer's browser -- with the
       orders placed after it queued behind it. Now it is kept here instead,
       and the reply says it is safe, so the browser lets it go. */
    try {
      holdFailed(ss, body, err);
      return say({ ok: true, held: String(err) });
    } catch (err2) {
      return say({ ok: false, error: String(err) + ' / hold: ' + String(err2) });
    }
  }
}

function holdFailed(ss, body, err) {
  const d = body[body.kind] || {};
  const b = d.buyer || {};
  const copy = JSON.parse(JSON.stringify(body));
  delete copy.secret;
  if (copy.brand) delete copy.brand.logoData;     // too big for a cell; the rest is kept
  const sh = ss.getSheetByName('Failed') || ss.insertSheet('Failed');
  if (!sh.getLastRow()) sh.getRange(1, 1, 1, FAILED_COLS.length).setValues([FAILED_COLS]);
  sh.getRange(sh.getLastRow() + 1, 1, 1, FAILED_COLS.length).setValues([[
    new Date(), body.kind, String(err).slice(0, 500),
    d.shop || d.brand || b.shop || '', "'" + (d.phone || b.phone || ''),
    JSON.stringify(copy).slice(0, 49000)
  ]]);
}

/* Finds or creates a tab and keeps its header honest: whenever the row does not
   match the column list, it is rewritten. The formatting is a courtesy and is
   allowed to fail: a tab turned into a Sheets table refuses number formats on
   its typed columns, and that must never stop the row itself being written. */
function tab(ss, name, cols) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  const head = sh.getLastRow()
    ? sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), cols.length)).getValues()[0]
    : [];
  if (head.slice(0, cols.length).join('|') !== cols.join('|')) {
    sh.getRange(1, 1, 1, cols.length).setValues([cols]);
    try {
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, cols.length).setFontWeight('bold');
    } catch (err) {}
  }
  /* A phone is a label, not a quantity: left as a number, Sheets eats a leading
     zero and turns a long one into 9.88E+11. */
  const phone = cols.indexOf('Phone') + 1;
  if (phone && sh.getMaxRows() > 1) {
    try { sh.getRange(2, phone, sh.getMaxRows() - 1, 1).setNumberFormat('@'); } catch (err) {}
  }
  return sh;
}

/* Always setValues, never appendRow: appendRow parses what it is given, so a
   phone with a leading zero arrives as a number with the zero gone. */
function write(sh, cols, values) {
  sh.getRange(sh.getLastRow() + 1, 1, 1, cols.length).setValues([values]);
}

function addressOf(b) {
  const a = (b && b.address) || {};
  return [a.line1, a.line2, a.city, [a.state, a.pincode].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ');
}

function appendOrder(ss, o) {
  const sh = tab(ss, 'Orders', ORDER_COLS);
  /* The client retries a failed post, so the same order can arrive twice.
     Column 2 is the order id. */
  const seen = sh.getLastRow() > 1
    ? sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0]))
    : [];
  if (seen.indexOf(String(o.id)) > -1) return;

  const now = new Date();
  const placed = o.placedAt ? new Date(o.placedAt) : now;
  const b = o.buyer || {};
  const addr = addressOf(b);
  const rows = [];
  (o.brands || []).forEach(g => (g.lines || []).forEach(l => {
    rows.push([now, o.id, placed, o.status,
      b.shop || '', b.phone || '', b.city || '', b.gst || '', b.type || '',
      g.name, l.origin || g.origin || '', l.title, l.category, l.size,
      l.unit, l.mrp, l.qty, l.total,
      o.subtotal, o.gst, o.freight, o.total, addr]);
  }));
  if (rows.length) {
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, ORDER_COLS.length).setValues(rows);
  }
}

function appendLead(ss, d) {
  write(tab(ss, 'Leads', LEAD_COLS), LEAD_COLS, [
    new Date(), d.shop || '', d.phone || '', d.city || '', d.gst || '',
    d.type || '', d.page || '', d.message || ''
  ]);
}

function appendBrand(ss, d) {
  write(tab(ss, 'Brands', BRAND_COLS), BRAND_COLS, [
    new Date(), d.brand || '', d.country || '', d.category || '', d.contact || '',
    d.phone || '', d.email || '', d.site || '', d.message || '', saveLogo(d), d.page || ''
  ]);
}

/* A sheet holds a link, not a file. The logo lands in one Drive folder, made on
   first use, and the cell carries its URL. */
function saveLogo(d) {
  if (!d.logoData) return '';
  try {
    const found = DriveApp.getFoldersByName(LOGO_FOLDER);
    const folder = found.hasNext() ? found.next() : DriveApp.createFolder(LOGO_FOLDER);
    const name = (d.brand || 'brand') + ' — ' + (d.logoName || 'logo');
    const blob = Utilities.newBlob(
      Utilities.base64Decode(d.logoData), d.logoType || 'application/octet-stream', name);
    return folder.createFile(blob).getUrl();
  } catch (err) {
    /* A logo that will not save must not cost you the enquiry. */
    return 'logo failed: ' + String(err);
  }
}

function authorise() { DriveApp.getRootFolder().getName(); }
