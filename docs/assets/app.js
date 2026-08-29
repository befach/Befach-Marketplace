/* ============================================================
   Befach — client-side prototype
   Hash router + catalogue views + trade-account cart.
   Data comes from assets/data.js (generated from the CSV).
   ============================================================ */
(function () {
'use strict';

var D          = window.BEFACH;
var PRODUCTS   = D.products;
var CATEGORIES = D.categories;
var BRANDS     = D.brands;
var PIPELINE   = D.pipeline;
var VALUES     = D.values;

var CAT = {};  CATEGORIES.forEach(function (c) { CAT[c.key] = c; });
var BR  = {};  BRANDS.forEach(function (b) { BR[b.id] = b; });
var VAL = {};  VALUES.forEach(function (v) { VAL[v.key] = v; });

/* ---------------- persistence ---------------- */
function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

var cart    = load('befach.cart', []);
var account = load('befach.account', null);   // null = pricing locked, Faire-style

/* ---------------- helpers ---------------- */
var inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
function rupee(n) { return '₹' + inr.format(Math.round(n || 0)); }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function byId(id) { return document.getElementById(id); }
function find(id) { return PRODUCTS.filter(function (p) { return p.slug === id || p.id === id; })[0]; }
function q(sel, root) { return (root || document).querySelector(sel); }
function qa(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }

/* The option a buyer picked, by title; falls back to the product default. */
function defaultVariant(p) { return (p.variants && p.variants[0]) || p; }
function variantOf(p, size) {
  if (!p) return { price: 0, mrp: 0, discount: 0, title: '' };
  var hit = (p.variants || []).filter(function (v) { return v.title === size; })[0];
  return hit || defaultVariant(p);
}

function reviewLabel(n) {
  if (!n) return 'New';
  return n >= 1000 ? (Math.floor(n / 100) / 10) + 'k reviews' : n + ' reviews';
}
function tagClass(label) {
  var l = (label || '').toLowerCase();
  if (/best seller|trending/.test(l))        return 'hot';
  if (/new launch/.test(l))                  return 'new';
  if (/limited|special|must try/.test(l))    return 'gold';
  return '';
}

/* ---------------- toast ---------------- */
var toastTimer;
function toast(msg) {
  var t = byId('toast');
  t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>' + esc(msg) + '</span>';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
}

/* ---------------- modal ---------------- */
function openModal(html) {
  byId('modal').innerHTML = html;
  byId('scrim').classList.add('show');
}
function closeModal() { byId('scrim').classList.remove('show'); }
byId('scrim').addEventListener('click', function (e) {
  if (e.target === byId('scrim')) closeModal();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeModal();
});

/* ---------------- cart ---------------- */
function cartCount() {
  return cart.reduce(function (n, l) { return n + l.qty; }, 0);
}
function cartTotal() {
  return cart.reduce(function (n, l) {
    var p = find(l.id);
    return n + (p ? variantOf(p, l.size).price * l.qty : 0);
  }, 0);
}
function addToCart(id, size, qty) {
  if (!account) { promptSignup(); return; }
  var key = id + '|' + (size || '');
  var line = cart.filter(function (l) { return l.key === key; })[0];
  if (line) line.qty += qty; else cart.push({ key: key, id: id, size: size || '', qty: qty });
  save('befach.cart', cart);
  syncChrome();
  var p = find(id);
  toast(p.title.slice(0, 34) + ' · ' + qty + (qty > 1 ? ' units' : ' unit') + ' added');
}
function setQty(key, qty) {
  cart = cart.filter(function (l) { return l.key !== key || qty > 0; });
  cart.forEach(function (l) { if (l.key === key) l.qty = qty; });
  save('befach.cart', cart);
  syncChrome();
  render();
}

function syncChrome() {
  var n   = cartCount();
  var dot = byId('cartDot');
  dot.hidden = n === 0;
  dot.textContent = n;
  byId('authBtn').textContent = account ? (account.shop || 'My account') : 'Sign in';
}

/* ---------------- the wholesale gate ---------------- */
function promptSignup() {
  openModal(
    '<h3>Ordering is for trade accounts</h3>' +
    '<p>Befach is a business-to-business market. Open a free retailer account to place ' +
    'orders, unlock 60-day payment terms and start with no minimum.</p>' +
    '<a href="#/join" class="btn btn-ink btn-block btn-lg" onclick="BefachUI.closeModal()">Open a retailer account</a>' +
    '<button class="btn btn-plain btn-block" style="margin-top:10px" onclick="BefachUI.closeModal()">Not now</button>'
  );
}
function signIn(shop, city) {
  account = { shop: shop || 'Demo Retail', city: city || 'Bengaluru' };
  save('befach.account', account);
  syncChrome();
  toast('Trade account active · you can place orders now');
}
function signOut() {
  account = null; cart = [];
  save('befach.account', null); save('befach.cart', []);
  syncChrome(); location.hash = '#/'; render();
}

/* ---------------- product card ---------------- */
function card(p) {
  var b   = BR[p.brandId] || { short: 'Befach' };
  var tag = p.badge ? '<span class="tag ' + tagClass(p.badge) + '">' + esc(p.badge) + '</span>' : '';
  var alt = p.img2 ? '<img class="alt" src="' + esc(p.img2) + '" alt="" loading="lazy">' : '';

  /* The brand's own listed price, exactly as its storefront shows it. */
  var priceBlock =
    '<div class="wholesale"><span class="amt">' + rupee(p.price) + '</span>' +
      (p.mrp ? '<span class="lbl">list price</span>' : '') + '</div>' +
    (p.mrp
      ? '<div class="msrp"><s>MRP ' + rupee(p.mrp) + '</s>' +
        '<span class="offchip">' + p.discount + '% off</span></div>'
      : '');

  /* not every source feed carries reviews — show the values instead of a blank star row */
  var rating = p.rating
    ? '<div class="rate"><svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7 .9-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-.9z"/></svg>' +
      '<b>' + p.rating.toFixed(1) + '</b><span>' + reviewLabel(p.reviews) + '</span></div>'
    : (p.values.length
        ? '<div class="rate"><span>' + p.values.slice(0, 2).map(function (v) {
            return esc((VAL[v] || {}).label || v); }).join(' · ') + '</span></div>'
        : '');

  return '<article class="card">' +
    '<a class="card-media" href="#/p/' + esc(p.slug) + '">' + tag +
      '<img src="' + esc(p.img) + '" alt="' + esc(p.title) + '" loading="lazy">' + alt +
    '</a>' +
    '<div class="card-body">' +
      '<div class="card-brand">' + esc(b.short) + '</div>' +
      '<a href="#/p/' + esc(p.slug) + '"><h3 class="card-title">' + esc(p.title) + '</h3></a>' +
      '<p class="card-usp">' + esc(p.usp) + '</p>' + rating +
      '<div class="price-row">' + priceBlock +
        '<div class="card-foot">' +
          '<span class="casepack">' + (defaultVariant(p).title ? esc(defaultVariant(p).title) : '&nbsp;') + '</span>' +
          '<button class="btn btn-ghost btn-sm" data-add="' + esc(p.slug) + '">Add</button>' +
        '</div>' +
      '</div>' +
    '</div></article>';
}
function grid(list, cls) {
  if (!list.length) {
    return '<div class="empty"><h3>Nothing matches those filters</h3>' +
           '<p>Try removing a filter or two.</p></div>';
  }
  return '<div class="prod-grid ' + (cls || '') + '">' + list.map(card).join('') + '</div>';
}

/* Browse can hold every product in the catalogue. Rendering ~900 cards in one
   pass cost 2s and 20k DOM nodes, on a page 169,000px tall — so page it. */
var PAGE_SIZE = 60;
var paged = { list: [], shown: 0 };

function gridPaged(list) {
  paged = { list: list, shown: Math.min(PAGE_SIZE, list.length) };
  if (!list.length) return grid(list);
  return '<div class="prod-grid" id="prodGrid">' +
      list.slice(0, paged.shown).map(card).join('') + '</div>' +
    (list.length > paged.shown
      ? '<div class="more-wrap">' +
          '<button class="btn btn-ghost btn-lg" id="moreBtn">Show 60 more</button>' +
          '<p class="more-count" id="moreCount">Showing ' + paged.shown +
          ' of ' + list.length + '</p>' +
        '</div>'
      : '');
}

/* ---------------- shared chrome ---------------- */
function navCats() {
  var hash = location.hash;
  var html = '<a class="navlink' + (/#\/browse(\?|$)/.test(hash) && !/cat=/.test(hash) ? ' on' : '') +
             '" href="#/browse">All products</a>';
  /* 24 categories is more than a nav bar can carry. Show the ten biggest,
     always include one the user has filtered to, and leave the rest to the
     browse rail, which lists every category with counts. */
  var top = CATEGORIES.filter(function (c) { return c.count; }).slice(0, 10);
  CATEGORIES.forEach(function (c) {
    if (hash.indexOf('cat=' + c.key) > -1 && top.indexOf(c) < 0) top.push(c);
  });
  html += top.map(function (c) {
    return '<a class="navlink' + (hash.indexOf('cat=' + c.key) > -1 ? ' on' : '') +
           '" href="#/browse?cat=' + c.key + '">' + esc(c.name) + '</a>';
  }).join('');
  html += '<a class="navlink" href="#/browse">All categories &rsaquo;</a>';
  html += '<a class="navlink accent" href="#/browse?sort=new">New this season</a>';
  byId('navCats').innerHTML = html;
}

/* ================= VIEW: home ================= */
function viewHome() {
  var hero = PRODUCTS.filter(function (p) { return /ghee|atta|honey|jaggery/i.test(p.title); });
  var pick = [hero[2] || PRODUCTS[2], hero[0] || PRODUCTS[0], hero[5] || PRODUCTS[5]];

  var bestsellers = PRODUCTS.filter(function (p) { return /best seller|trending/i.test(p.badge); }).slice(0, 10);
  var fresh       = PRODUCTS.filter(function (p) { return /new launch|must try|special|value pack/i.test(p.badge); }).slice(0, 5);

  var catTiles = CATEGORIES.filter(function (c) { return c.count; }).slice(0, 12).map(function (c) {
    var rep = PRODUCTS.filter(function (p) { return p.category === c.key; })[0];
    return '<a class="cat-tile" href="#/browse?cat=' + c.key + '">' +
      '<div class="cat-thumb"><img src="' + esc(rep.img) + '" alt="" loading="lazy"></div>' +
      '<h4>' + esc(c.name) + '</h4>' +
      '<span class="deva">' + esc(c.hi) + '</span>' +
      '<span>' + c.count + ' product' + (c.count===1?'':'s') + '</span></a>';
  }).join('');

  return '' +
  '<section class="hero"><div class="wrap hero-grid">' +
    '<div>' +
      '<span class="eyebrow">Wholesale, made in India</span>' +
      '<h1>Stock your shelves with what <em>India actually makes</em>.</h1>' +
      '<p class="hero-sub">Befach puts independent Indian makers — farm kitchens, cold-press mills, ' +
      'weavers and potters — in front of the shops that should be carrying them. ' +
      'Wholesale rates, 60-day terms, one order across every brand.</p>' +
      '<div class="hero-cta">' +
        '<a href="#/join" class="btn btn-ink btn-lg">Open a retailer account</a>' +
        '<a href="#/sell" class="btn btn-ghost btn-lg">I make things &rarr;</a>' +
      '</div>' +
      '<p class="hero-note">Free to join · No minimum on your first order · Free returns on openers</p>' +
    '</div>' +
    '<div class="arch-collage">' +
      '<div class="arch arch-a"><img src="' + esc(pick[0].img) + '" alt=""></div>' +
      '<div class="arch arch-b"><img src="' + esc(pick[1].img) + '" alt="">' +
        '<div class="hero-stat"><b>' + PRODUCTS.length + '</b>products live</div></div>' +
      '<div class="arch arch-c"><img src="' + esc(pick[2].img) + '" alt=""></div>' +
    '</div>' +
  '</div></section>' +

  '<section class="trust"><div class="wrap trust-grid">' +
    trustItem('M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'Pay 60 days later',
      'Take stock now, pay after it has sold. Standard on every Befach order.') +
    trustItem('M20 6 9 17l-5-5', 'Free returns on openers',
      'Your first order from any brand is returnable. Trying a brand costs nothing.') +
    trustItem('M4 4h16v6H4zM4 14h16v6H4z', 'One cart, every brand',
      'Mix twelve makers into a single order, a single invoice, a single delivery.') +
    trustItem('M12 2 3 7v6c0 5 3.8 8.4 9 9 5.2-.6 9-4 9-9V7z', 'Vetted makers only',
      'FSSAI, GST and lab papers checked before a brand ever goes live.') +
  '</div></section>' +

  '<section class="sec"><div class="wrap">' +
    '<div class="sec-head"><div>' +
      '<h2>Shop by category</h2>' +
      '<p>Twelve shelves of Indian pantry staples, sourced from the farm that grew them.</p>' +
    '</div><a class="link-more" href="#/browse">See all ' + PRODUCTS.length + ' products</a></div>' +
    '<div class="cat-grid">' + catTiles + '</div>' +
  '</div></section>' +

  '<section class="sec-tight"><div class="wrap">' +
    '<div class="sec-head"><div><h2>Shop by what you stand for</h2>' +
    '<p>Your customers ask. These filters answer.</p></div></div>' +
    '<div class="val-row">' + VALUES.map(function (v) {
      return '<a class="val-pill" href="#/browse?v=' + v.key + '">' +
             '<span class="deva">' + esc(v.hi) + '</span>' + esc(v.label) + '</a>';
    }).join('') + '</div>' +
  '</div></section>' +

  /* Two full spotlights only — six of these stacked is a wall. The rest get
     a compact rail below. */
  BRANDS.slice(0, 2).map(function (b, i) {
    var mine  = PRODUCTS.filter(function (p) { return p.brandId === b.id; });
    var shots = mine.slice(i === 0 ? 0 : 3, (i === 0 ? 0 : 3) + 4);
    return '<section class="' + (i === 0 ? 'sec' : 'sec-tight') + '"><div class="wrap">' +
      '<div class="spot jaali"><div class="spot-inner' + (i % 2 ? ' flip' : '') + '">' +
        '<div class="spot-copy">' +
          '<span class="eyebrow">' + (i === 0 ? 'Brand in focus' : 'Also on Befach') + '</span>' +
          '<h2>' + esc(b.name) + '</h2>' +
          '<p>' + esc(b.story) + '</p>' +
          '<div class="spot-meta">' +
            '<div><span>Ships from</span><b>' + esc(b.shipsFrom) + '</b></div>' +
            '<div><span>Opening order</span><b>' + rupee(b.openingMin) + '</b></div>' +
            '<div><span>Lead time</span><b>' + esc(b.leadDays) + ' days</b></div>' +
          '</div>' +
          '<a href="#/brand/' + esc(b.id) + '" class="btn btn-gold btn-lg">' +
          'View all ' + mine.length + ' products</a>' +
        '</div>' +
        '<div class="spot-shots">' + shots.map(function (p) {
          return '<img src="' + esc(p.img) + '" alt="' + esc(p.title) + '" loading="lazy">';
        }).join('') + '</div>' +
      '</div></div>' +
    '</div></section>';
  }).join('') +

  (BRANDS.length > 2
    ? '<section class="sec-tight"><div class="wrap">' +
        '<div class="sec-head"><div><h2>More brands on Befach</h2>' +
        '<p>Every one vetted, on 60-day terms, in the same cart.</p></div>' +
        '<a class="link-more" href="#/browse">Shop all ' + PRODUCTS.length + ' products</a></div>' +
        '<div class="pipeline-grid">' + BRANDS.slice(2).map(function (b) {
          var n = PRODUCTS.filter(function (p) { return p.brandId === b.id; }).length;
          return '<a class="pbrand" href="#/brand/' + esc(b.id) + '">' +
            '<div class="mono" style="background:' + esc(b.accent) + '">' +
              esc(b.short.charAt(0)) + '</div>' +
            '<h5>' + esc(b.name) + '</h5>' +
            '<span>' + esc(b.shipsFrom) + '</span>' +
            '<span>' + n + ' products</span></a>';
        }).join('') + '</div>' +
      '</div></section>'
    : '') +

  '<section class="sec-tight"><div class="wrap">' +
    '<div class="sec-head"><div><h2>Moving fastest this month</h2>' +
    '<p>What other retailers are reordering.</p></div>' +
    '<a class="link-more" href="#/browse?sort=rating">Browse top rated</a></div>' +
    grid(bestsellers.slice(0, 5), 'five') +
  '</div></section>' +

  '<section class="sec"><div class="wrap">' +
    '<div class="sec-head"><div><h2>New this season</h2>' +
    '<p>Just landed from the makers.</p></div>' +
    '<a class="link-more" href="#/browse?sort=new">See everything new</a></div>' +
    grid(fresh, 'five') +
  '</div></section>' +

  '<section class="sec-tight"><div class="wrap">' +
    '<div class="sec-head"><div><h2>Onboarding now</h2>' +
    '<p>Makers in the queue, going live over the next quarter.</p></div>' +
    '<a class="link-more" href="#/sell">Put your brand here</a></div>' +
    '<div class="pipeline-grid">' + PIPELINE.map(function (b) {
      return '<div class="pbrand"><div class="mono" style="background:' + esc(b.accent) + '">' +
        esc(b.name.charAt(0)) + '</div><h5>' + esc(b.name) + '</h5>' +
        '<span>' + esc(b.cat) + '</span><span>' + esc(b.city) + '</span></div>';
    }).join('') + '</div>' +
  '</div></section>' +

  '<div class="blockprint" style="margin:0 0 -1px"></div>';
}
function trustItem(path, title, body) {
  return '<div class="trust-item">' +
    '<svg class="trust-ico" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="' + path + '"/></svg>' +
    '<h4>' + esc(title) + '</h4><p>' + esc(body) + '</p></div>';
}

/* ================= VIEW: browse ================= */
function viewBrowse(params) {
  var cats  = (params.cat || '').split(',').filter(Boolean);
  var vals  = (params.v   || '').split(',').filter(Boolean);
  var brs   = (params.b   || '').split(',').filter(Boolean);
  var sort  = params.sort || 'featured';
  var term  = (params.q || '').toLowerCase().trim();

  var list = PRODUCTS.filter(function (p) {
    if (cats.length && cats.indexOf(p.category) < 0) return false;
    if (brs.length  && brs.indexOf(p.brandId) < 0) return false;
    if (vals.length && !vals.every(function (v) { return p.values.indexOf(v) > -1; })) return false;
    if (term && (p.title + ' ' + p.usp).toLowerCase().indexOf(term) < 0) return false;
    return true;
  });

  var sorters = {
    'price-asc':  function (a, b) { return a.price - b.price; },
    'price-desc': function (a, b) { return b.price - a.price; },
    'rating':     function (a, b) { return (b.rating - a.rating) || (b.reviews - a.reviews); },
    'new':        function (a, b) { return score(b) - score(a); },
    'featured':   function (a, b) { return (b.reviews || 0) - (a.reviews || 0); }
  };
  function score(p) { return /new launch/i.test(p.badge) ? 2 : /special|must try|limited/i.test(p.badge) ? 1 : 0; }
  list = list.slice().sort(sorters[sort] || sorters.featured);

  var title = cats.length === 1 ? CAT[cats[0]].name
            : brs.length  === 1 ? BR[brs[0]].name
            : vals.length === 1 ? VAL[vals[0]].label
            : term              ? '"' + term + '"'
            : 'All products';
  var sub = cats.length === 1 ? CAT[cats[0]].tagline
          : brs.length  === 1 ? BR[brs[0]].tagline
          : 'Across every Indian maker on Befach';

  /* filter rail */
  function fopts(group, items, active) {
    return items.map(function (it) {
      var on = active.indexOf(it.key) > -1;
      return '<label class="fopt' + (on ? ' on' : '') + '">' +
        '<input type="checkbox" data-f="' + group + '" value="' + it.key + '"' + (on ? ' checked' : '') + '>' +
        '<span>' + esc(it.label) + '</span>' +
        (it.n != null ? '<span class="n">' + it.n + '</span>' : '') + '</label>';
    }).join('');
  }
  var catItems = CATEGORIES.filter(function (c) { return c.count; })
    .map(function (c) { return { key: c.key, label: c.name, n: c.count }; });
  var valItems = VALUES.map(function (v) {
    return { key: v.key, label: v.label,
             n: PRODUCTS.filter(function (p) { return p.values.indexOf(v.key) > -1; }).length };
  });

  var brandItems = BRANDS.map(function (b) {
    return { key: b.id, label: b.short,
             n: PRODUCTS.filter(function (p) { return p.brandId === b.id; }).length };
  });

  var chips = cats.map(function (c) { return chip('cat', c, CAT[c].name); })
    .concat(brs.map(function (b) { return chip('b', b, BR[b].short); }))
    .concat(vals.map(function (v) { return chip('v', v, VAL[v].label); })).join('');
  function chip(g, k, label) {
    return '<span class="chip">' + esc(label) +
           '<button data-clear="' + g + '" data-val="' + k + '" aria-label="Remove">&times;</button></span>';
  }

  return '<div class="wrap browse">' +
    '<aside class="filters">' +
      '<div class="fgroup"><h4>Brand</h4>' + fopts('b', brandItems, brs) +
        '<p style="font-size:12px;color:var(--ink-mute);margin-top:9px;line-height:1.5">' +
        PIPELINE.length + ' more brands onboarding this quarter.</p></div>' +
      '<div class="fgroup"><h4>Category</h4>' + fopts('cat', catItems, cats) + '</div>' +
      '<div class="fgroup"><h4>Values</h4>' + fopts('v', valItems, vals) + '</div>' +
      '<div class="fgroup" style="border:0">' +
        '<a class="btn btn-ghost btn-sm btn-block" href="#/browse">Clear all filters</a></div>' +
    '</aside>' +
    '<section>' +
      '<div class="browse-head"><div><h1>' + esc(title) + '</h1>' +
        '<p class="cnt">' + list.length + ' product' + (list.length === 1 ? '' : 's') +
        ' · ' + esc(sub) + '</p></div>' +
        '<select class="sortsel" id="sortSel">' +
          opt('featured', 'Most reviewed', sort) + opt('rating', 'Top rated', sort) +
          opt('new', 'Newest', sort) + opt('price-asc', 'Price: low to high', sort) +
          opt('price-desc', 'Price: high to low', sort) +
        '</select></div>' +
      (chips ? '<div class="chips">' + chips + '</div>' : '') +
      gridPaged(list) +
    '</section></div>';
}
function opt(v, label, cur) {
  return '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + label + '</option>';
}

/* Price block for one variant. Shared by first render and every size change. */
function priceBoxHtml(v, qty) {
  qty = qty || 1;
  return '<div class="big">' + rupee(v.price) + '</div>' +
    '<div class="sub">' +
      (v.mrp ? '<s>MRP ' + rupee(v.mrp) + '</s>' +
               '<span class="offchip">' + v.discount + '% off</span>' : '') +
      (v.title ? '<span>' + esc(v.title) + '</span>' : '') +
    '</div>' +
    (qty > 1
      ? '<div class="line-total">' + qty + ' &times; ' + rupee(v.price) +
        ' = <b>' + rupee(v.price * qty) + '</b></div>'
      : '');
}

/* ================= VIEW: product ================= */
function viewProduct(slug) {
  var p = find(slug);
  if (!p) return notFound();
  var b    = BR[p.brandId];
  var cat  = CAT[p.category];
  var same = PRODUCTS.filter(function (x) { return x.category === p.category && x.slug !== p.slug; }).slice(0, 5);
  /* Price box is re-rendered whenever the size changes, so the figure always
     belongs to the option that is actually selected. */
  var pricing = '<div id="priceBox">' + priceBoxHtml(p.variants[0] || p) + '</div>' +
    '<p class="trade-note">' + esc(b.short) + ' sets its trade rate at onboarding. ' +
    'The price above is the brand’s own listed price.</p>';

  var opts = (p.variants || []).filter(function (v) { return v.title; });
  var sizes = opts.length > 1
    ? '<div><label style="font-size:12.5px;font-weight:600;letter-spacing:.05em;' +
      'text-transform:uppercase;color:var(--ink-mute)">Size</label>' +
      '<div class="opt-row" id="sizeRow">' + opts.map(function (v, i) {
        return '<button class="opt' + (i === 0 ? ' on' : '') + '" data-vi="' + i + '">' +
               esc(v.title) + '<em>' + rupee(v.price) + '</em></button>';
      }).join('') + '</div></div>'
    : (opts.length === 1
        ? '<p class="single-size">Sold as <b>' + esc(opts[0].title) + '</b></p>' : '');

  return '<div class="wrap"><div class="pdp">' +
    '<div class="pdp-media">' +
      '<div class="m"><img src="' + esc(p.img) + '" alt="' + esc(p.title) + '"></div>' +
      (p.img2 ? '<div class="m"><img src="' + esc(p.img2) + '" alt=""></div>' : '') +
      '<div class="m"><img src="' + esc((same[0] || p).img) + '" alt=""></div>' +
    '</div>' +
    '<div>' +
      '<a class="pdp-brandlink" href="#/brand/' + esc(b.id) + '">' + esc(b.name) + '</a>' +
      '<h1>' + esc(p.title) + '</h1>' +
      (p.usp ? '<p class="pdp-usp">' + esc(p.usp) + '</p>' : '') +
      (p.rating ? '<div class="rate"><svg viewBox="0 0 24 24"><path d="m12 2 3 6.6 7 .9-5 4.9 1.2 7L12 18l-6.2 3.4L7 14.4 2 9.5l7-.9z"/></svg>' +
        '<b>' + p.rating.toFixed(1) + '</b><span>' + reviewLabel(p.reviews) + '</span></div>' : '') +
      '<div class="pricebox">' + pricing + '</div>' + sizes +
      '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:6px">' +
        '<div class="qty"><button data-q="-1">&minus;</button><span id="qtyVal">1</span>' +
        '<button data-q="1">+</button></div>' +
        '<button class="btn btn-ink btn-lg" id="addBtn" style="flex:1;min-width:190px">' +
        (account ? 'Add to order' : 'Sign in to order') + '</button>' +
      '</div>' +
      (p.desc
        ? '<div class="pdp-desc"><h3>About this product</h3><p>' + esc(p.desc) + '</p>' +
          '<span class="src-note">Description as published by ' + esc(b.name) + '</span></div>'
        : '') +
      '<div class="spec"><dl>' +
        '<dt>Category</dt><dd>' + esc(cat.name) + '</dd>' +

        '<dt>Ships from</dt><dd>' + esc(b.shipsFrom) + '</dd>' +
        '<dt>Lead time</dt><dd>' + esc(b.leadDays) + ' working days</dd>' +
        '<dt>Opening order</dt><dd>' + rupee(b.openingMin) + ' minimum</dd>' +
        '<dt>Payment</dt><dd>Net 60 · pay 60 days after delivery</dd>' +
        '<dt>Returns</dt><dd>Free on your opening order</dd>' +
        (p.values.length ? '<dt>Values</dt><dd>' + p.values.map(function (v) {
          return esc(VAL[v].label); }).join(' · ') + '</dd>' : '') +
      '</dl></div>' +
    '</div></div>' +
    (same.length ? '<section class="sec-tight"><div class="sec-head"><div>' +
      '<h2>More from ' + esc(cat.name) + '</h2></div>' +
      '<a class="link-more" href="#/browse?cat=' + p.category + '">See all ' + cat.count + '</a></div>' +
      grid(same, 'five') + '</section>' : '') +
  '</div>';
}

/* ================= VIEW: brand ================= */
function viewBrand(id) {
  var b = BR[id];
  if (!b) return notFound();
  var list  = PRODUCTS.filter(function (p) { return p.brandId === b.id; });
  var shots = list.slice(0, 4);
  var byCat = CATEGORIES.filter(function (c) {
    return list.some(function (p) { return p.category === c.key; });
  });

  return '<div class="wrap">' +
    '<div class="brand-hero">' +
      '<div class="brand-hero-bg">' + shots.map(function (p) {
        return '<img src="' + esc(p.img) + '" alt="">'; }).join('') + '</div>' +
      '<div class="brand-hero-veil"></div>' +
      '<div class="brand-hero-in">' +
        '<h1>' + esc(b.name) + '</h1>' +
        '<div class="loc"><span>' + esc(b.city) + ', ' + esc(b.state) + '</span><span>·</span>' +
        (b.since ? '<span>Since ' + b.since + '</span><span>·</span>' : '') +
        '<span>' + list.length + ' products</span></div>' +
        '<div class="badge-row">' + b.values.map(function (v) {
          return '<span class="vbadge">' + esc(VAL[v].label) + '</span>'; }).join('') +
          '<span class="vbadge">' + esc(b.prep.split(' · ')[0]) + '</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="brand-bar">' +
      '<div><span>Opening order</span><b>' + rupee(b.openingMin) + '</b></div>' +
      '<div><span>Reorder minimum</span><b>' + rupee(b.reorderMin) + '</b></div>' +
      '<div><span>Lead time</span><b>' + esc(b.leadDays) + ' days</b></div>' +
      '<div><span>Payment</span><b>Net 60</b></div>' +
      '<div class="grow">' +
        (account ? '<a href="#/browse" class="btn btn-ink">Build an order</a>'
                 : '<a href="#/join" class="btn btn-ink">Open an account</a>') + '</div>' +
    '</div>' +
    '<section style="max-width:70ch;margin-bottom:40px">' +
      '<h2 style="font-size:26px;margin-bottom:12px">The farm</h2>' +
      '<p style="color:var(--ink-soft);font-size:15.5px;line-height:1.7">' + esc(b.story) + '</p>' +
      '<p style="color:var(--ink-mute);font-size:13.5px;margin-top:14px">' + esc(b.prep) + '</p>' +
    '</section>' +
    byCat.map(function (c) {
      var sub = list.filter(function (p) { return p.category === c.key; });
      return '<section class="sec-tight" style="padding-top:0">' +
        '<div class="sec-head"><div><h2 style="font-size:24px">' + esc(c.name) +
        ' <span class="deva" style="color:var(--haldi);font-size:19px">' + esc(c.hi) + '</span></h2>' +
        '<p>' + esc(c.tagline) + '</p></div>' +
        '<a class="link-more" href="#/browse?cat=' + c.key + '">All ' + sub.length + '</a></div>' +
        grid(sub.slice(0, 5), 'five') + '</section>';
    }).join('') +
  '</div>';
}

/* ================= VIEW: cart ================= */
function viewCart() {
  if (!cart.length) {
    return '<div class="wrap"><div class="empty"><h3>Your order is empty</h3>' +
      '<p>Add cases from any brand — they ship together on one invoice.</p>' +
      '<a href="#/browse" class="btn btn-ink btn-lg" style="margin-top:20px">Browse products</a></div></div>';
  }
  /* Orders are per brand on Faire, and so are the minimums. Group accordingly. */
  var groups = BRANDS.map(function (b) {
    var lines = cart.filter(function (l) { return (find(l.id) || {}).brandId === b.id; });
    var sub   = lines.reduce(function (n, l) {
      var p = find(l.id); return n + variantOf(p, l.size).price * l.qty;
    }, 0);
    return { brand: b, lines: lines, sub: sub, met: sub >= b.openingMin };
  }).filter(function (g) { return g.lines.length; });

  var sub     = groups.reduce(function (n, g) { return n + g.sub; }, 0);
  var gst     = Math.round(sub * 0.05);
  var freight = groups.reduce(function (n, g) { return n + (g.met ? 0 : 850); }, 0);
  var shortBy = groups.filter(function (g) { return !g.met; });

  function lineRow(l) {
    var p = find(l.id); if (!p) return '';
    var vr = variantOf(p, l.size);
    return '<div class="cart-line">' +
      '<img src="' + esc(p.img) + '" alt="">' +
      '<div><h4>' + esc(p.title) + '</h4>' +
        '<div class="meta">' + (l.size ? esc(l.size) + ' · ' : '') +
        rupee(vr.price) + ' each' +
        (vr.mrp ? ' · <s style="color:var(--ink-mute)">MRP ' + rupee(vr.mrp) + '</s>' +
                  ' <span style="color:var(--leaf);font-weight:600">' + vr.discount +
                  '% off</span>' : '') + '</div>' +
        '<div class="qty" style="margin-top:10px">' +
          '<button data-cq="' + esc(l.key) + '" data-d="-1">&minus;</button>' +
          '<span>' + l.qty + '</span>' +
          '<button data-cq="' + esc(l.key) + '" data-d="1">+</button></div>' +
      '</div>' +
      '<div style="text-align:right"><b style="font-family:var(--serif);font-size:18px">' +
        rupee(vr.price * l.qty) + '</b>' +
        '<div style="font-size:12px;color:var(--ink-mute);margin-top:4px">' +
        l.qty + (l.qty === 1 ? ' unit' : ' units') + '</div>' +
        '<button class="btn btn-plain btn-sm" data-cq="' + esc(l.key) + '" data-d="x" ' +
        'style="color:var(--sindoor);font-size:12px;padding:0;margin-top:6px">Remove</button></div>' +
    '</div>';
  }

  var sections = groups.map(function (g) {
    var pct = Math.min(100, Math.round(g.sub / g.brand.openingMin * 100));
    return '<section style="margin-bottom:30px">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px;' +
        'border-bottom:2px solid var(--ink);padding-bottom:9px;margin-bottom:4px;flex-wrap:wrap">' +
        '<a href="#/brand/' + esc(g.brand.id) + '"><h3 style="font-size:20px">' +
          esc(g.brand.name) + '</h3></a>' +
        '<span style="font-size:12.5px;color:var(--ink-soft)">Ships from ' +
          esc(g.brand.shipsFrom) + ' · ' + esc(g.brand.leadDays) + ' days</span>' +
      '</div>' +
      g.lines.map(lineRow).join('') +
      '<div style="padding-top:12px">' +
        (g.met
          ? '<p style="font-size:13px;color:var(--leaf);font-weight:600">' +
            '&#10003; ' + rupee(g.sub) + ' · opening minimum met, freight on us</p>'
          : '<p style="font-size:13px;color:var(--ink-soft)">' + rupee(g.sub) + ' of ' +
            rupee(g.brand.openingMin) + ' minimum — add <b>' +
            rupee(g.brand.openingMin - g.sub) + '</b> to unlock free freight.</p>' +
            '<div class="progress" style="max-width:340px"><i style="width:' + pct + '%"></i></div>') +
      '</div></section>';
  }).join('');

  return '<div class="wrap cart-wrap">' +
    '<div>' +
      '<h1 style="font-size:32px;margin-bottom:6px">Your order</h1>' +
      '<p style="color:var(--ink-soft);font-size:14px;margin-bottom:24px">' +
        cartCount() + ' item' + (cartCount() === 1 ? '' : 's') + ' from ' +
        groups.length + ' brand' + (groups.length === 1 ? '' : 's') +
        ' · one invoice, one delivery</p>' +
      sections +
    '</div>' +
    '<aside class="summary">' +
      '<h3 style="font-size:20px;margin-bottom:14px">Summary</h3>' +
      (shortBy.length
        ? '<p style="font-size:13px;color:var(--sindoor);font-weight:600;margin-bottom:14px">' +
          shortBy.length + ' brand' + (shortBy.length === 1 ? ' is' : 's are') +
          ' below the opening minimum.</p>'
        : '<p style="font-size:13px;color:var(--leaf);font-weight:600;margin-bottom:14px">' +
          '&#10003; Every minimum met · freight is on us</p>') +
      groups.map(function (g) {
        return '<div class="sum-line"><span>' + esc(g.brand.short) + '</span><span>' +
               rupee(g.sub) + '</span></div>';
      }).join('') +
      '<div class="sum-line"><span>GST (5%)</span><span>' + rupee(gst) + '</span></div>' +
      '<div class="sum-line"><span>Freight</span><span>' +
        (freight ? rupee(freight) : 'Free') + '</span></div>' +
      '<div class="sum-line total"><span>Due in 60 days</span><span>' +
        rupee(sub + gst + freight) + '</span></div>' +
      '<p style="font-size:12px;color:var(--ink-mute);margin:12px 0 16px;line-height:1.5">' +
        'Nothing is charged today. Payment is collected 60 days after delivery. ' +
        'Your opening order from each brand is fully returnable.</p>' +
      '<button class="btn btn-ink btn-lg btn-block"' + (shortBy.length ? ' disabled' : '') +
        ' id="placeBtn">Place order</button>' +
      '<a href="#/browse" class="btn btn-plain btn-block" style="margin-top:8px">Keep shopping</a>' +
    '</aside></div>';
}

/* ================= VIEW: retailer signup ================= */
function viewJoin() {
  if (account) {
    return '<div class="wrap"><div class="empty">' +
      '<h3>Signed in as ' + esc(account.shop) + '</h3>' +
      '<p>Wholesale pricing is unlocked across the catalogue.</p>' +
      '<div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap">' +
      '<a href="#/browse" class="btn btn-ink btn-lg">Browse wholesale</a>' +
      '<button class="btn btn-ghost btn-lg" id="signOutBtn">Sign out</button></div></div></div>';
  }
  var shots = PRODUCTS.slice(6, 10);
  return '<div class="split">' +
    '<div class="split-form">' +
      '<span class="eyebrow">For retailers</span>' +
      '<h1>Open your trade account</h1>' +
      '<p>Free, takes two minutes. Once you are verified you will see wholesale rates ' +
      'across every brand on Befach.</p>' +
      '<form id="joinForm">' +
        '<div class="field"><label for="shop">Shop name</label>' +
          '<input id="shop" required placeholder="e.g. Gopal Stores"></div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="city">City</label>' +
            '<input id="city" required placeholder="Bengaluru"></div>' +
          '<div class="field"><label for="gst">GSTIN</label>' +
            '<input id="gst" placeholder="29ABCDE1234F1Z5"></div>' +
        '</div>' +
        '<div class="field"><label for="type">Shop type</label>' +
          '<select id="type"><option>Grocery / kirana</option><option>Organic &amp; health store</option>' +
          '<option>Cafe / restaurant</option><option>Gift &amp; concept store</option>' +
          '<option>Online retailer</option></select></div>' +
        '<button class="btn btn-ink btn-lg btn-block" type="submit">Create account</button>' +
      '</form>' +
      '<ul class="perks">' +
        perk('60 days to pay on every order, from day one.') +
        perk('Free returns on your first order from any brand.') +
        perk('No minimum on your opening order.') +
        perk('One invoice and one delivery across every maker.') +
      '</ul>' +
      '<p style="font-size:12px;color:var(--ink-mute);margin-top:20px">' +
      'Prototype: no data leaves your browser.</p>' +
    '</div>' +
    '<div class="split-art">' + shots.map(function (p) {
      return '<img src="' + esc(p.img) + '" alt="">'; }).join('') + '</div>' +
  '</div>';
}
function perk(t) {
  return '<li><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M20 6 9 17l-5-5"/></svg><span>' + esc(t) + '</span></li>';
}

/* ================= VIEW: sell ================= */
function viewSell() {
  return '<section class="hero"><div class="wrap hero-grid">' +
    '<div><span class="eyebrow">For makers</span>' +
      '<h1>Your craft deserves <em>better shelves</em>.</h1>' +
      '<p class="hero-sub">Befach gets your products in front of thousands of vetted Indian retailers. ' +
      'We handle discovery, credit risk, invoicing and returns. You handle the making.</p>' +
      '<div class="hero-cta">' +
        '<a href="#/join" class="btn btn-ink btn-lg">Apply to sell</a>' +
        '<a href="#/browse" class="btn btn-ghost btn-lg">See the marketplace</a>' +
      '</div>' +
      '<p class="hero-note">No listing fee · 15% on new-retailer orders · 3% on reorders</p>' +
    '</div>' +
    '<div class="arch-collage">' + PRODUCTS.slice(20, 23).map(function (p, i) {
      return '<div class="arch arch-' + 'abc'.charAt(i) + '"><img src="' + esc(p.img) + '" alt=""></div>';
    }).join('') + '</div>' +
  '</div></section>' +

  '<section class="sec"><div class="wrap">' +
    '<div class="sec-head"><div><h2>How Befach works for a brand</h2>' +
    '<p>Three steps from application to your first wholesale order.</p></div></div>' +
    '<div class="steps">' +
      '<div class="step"><div class="step-n">01</div><h4>Apply and get verified</h4>' +
      '<p>Send us your GST, FSSAI and lab reports. We check the papers so retailers do not have to. ' +
      'Most brands clear review inside a week.</p></div>' +
      '<div class="step"><div class="step-n">02</div><h4>Upload your line sheet</h4>' +
      '<p>A CSV of products, wholesale rates, MRP and case packs. We build the storefront, ' +
      'the photography grid and the search listings for you.</p></div>' +
      '<div class="step"><div class="step-n">03</div><h4>We carry the risk</h4>' +
      '<p>You are paid on dispatch. Befach extends the 60-day terms to the retailer and absorbs ' +
      'any default. Returns on opening orders are on us too.</p></div>' +
    '</div>' +
  '</div></section>' +

  '<section class="sec-tight"><div class="wrap">' +
    '<div class="spot jaali"><div class="spot-inner">' +
      '<div class="spot-copy"><span class="eyebrow">The economics</span>' +
        '<h2>Built so a small maker can actually say yes.</h2>' +
        '<p>No listing fees, no subscription, no ad auction. Befach only earns when you sell, ' +
        'and earns far less once a retailer is yours.</p>' +
        '<div class="spot-meta">' +
          '<div><span>New retailer</span><b>15%</b></div>' +
          '<div><span>Every reorder</span><b>3%</b></div>' +
          '<div><span>Listing fee</span><b>Nil</b></div>' +
        '</div>' +
        '<a href="#/join" class="btn btn-gold btn-lg">Apply to sell</a></div>' +
      '<div class="spot-shots">' + PRODUCTS.slice(30, 34).map(function (p) {
        return '<img src="' + esc(p.img) + '" alt="" loading="lazy">'; }).join('') + '</div>' +
    '</div></div>' +
  '</div></section>';
}

function notFound() {
  return '<div class="wrap"><div class="empty"><h3>Page not found</h3>' +
    '<p>That link does not lead anywhere yet.</p>' +
    '<a href="#/" class="btn btn-ink btn-lg" style="margin-top:20px">Back to Befach</a></div></div>';
}

/* ================= router ================= */
function parseHash() {
  var raw   = location.hash.replace(/^#/, '') || '/';
  var parts = raw.split('?');
  var path  = parts[0].split('/').filter(Boolean);
  var params = {};
  (parts[1] || '').split('&').filter(Boolean).forEach(function (kv) {
    var i = kv.indexOf('=');
    params[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1));
  });
  return { path: path, params: params };
}

function render() {
  var r    = parseHash();
  var app  = byId('app');
  var head = r.path[0] || 'home';
  var html;

  if      (head === 'home')    html = viewHome();
  else if (head === 'browse')  html = viewBrowse(r.params);
  else if (head === 'p')       html = viewProduct(r.path[1]);
  else if (head === 'brand')   html = viewBrand(r.path[1]);
  else if (head === 'cart')    html = viewCart();
  else if (head === 'join')    html = viewJoin();
  else if (head === 'sell')    html = viewSell();
  else                         html = notFound();

  app.innerHTML = '<div class="fade">' + html + '</div>';
  navCats();
  syncChrome();
  bindView(r);
  var qEl = byId('q');
  if (qEl && document.activeElement !== qEl) qEl.value = r.params.q || '';
  drift();
}

/* ================= hero arch drift ================= */
/* --drift on .arch-collage tracks how far the hero has scrolled away (0 -> 1).
   The CSS turns that into: left arch out left, right arch out right, middle up. */
var driftQueued = false;

function driftFrame() {
  driftQueued = false;
  var collage = document.querySelector('.arch-collage');
  if (!collage) return;
  var hero = collage.closest('.hero');
  if (!hero) return;
  /* Measure from scroll position, not the hero's box: the hero sits below the
     promo bar and header, so its top only reaches the viewport after ~176px of
     scroll and the drift would not start until then. Capping the travel at one
     viewport keeps the motion brisk on tall screens. */
  var travel = Math.min(hero.offsetHeight, window.innerHeight || hero.offsetHeight) || 1;
  var y = window.pageYOffset || document.documentElement.scrollTop || 0;
  var p = y / travel;
  collage.style.setProperty('--drift', (p < 0 ? 0 : p > 1 ? 1 : p).toFixed(4));
}

function drift() {
  if (driftQueued || reduceMotion()) return;
  driftQueued = true;
  requestAnimationFrame(driftFrame);
}

function reduceMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches);
}

/* ================= per-view bindings ================= */
function bindView(r) {
  /* browse: filters + sort + chips */
  qa('[data-f]').forEach(function (box) {
    box.addEventListener('change', function () {
      var group = box.getAttribute('data-f');
      var cur   = (r.params[group] || '').split(',').filter(Boolean);
      var v     = box.value;
      var next  = box.checked ? cur.concat([v]) : cur.filter(function (x) { return x !== v; });
      go(assign(r.params, group, next.join(',')));
    });
  });
  qa('[data-clear]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var g    = btn.getAttribute('data-clear');
      var next = (r.params[g] || '').split(',')
                 .filter(function (x) { return x && x !== btn.getAttribute('data-val'); });
      go(assign(r.params, g, next.join(',')));
    });
  });
  var sortSel = byId('sortSel');
  if (sortSel) sortSel.addEventListener('change', function () {
    go(assign(r.params, 'sort', sortSel.value));
  });

  /* product detail: size, qty, add */
  var qtyVal = byId('qtyVal');
  if (qtyVal) {
    var prod = find(r.path[1]) || {};
    var opts = (prod.variants || []).filter(function (v) { return v.title; });
    var pool = opts.length ? opts : [prod];
    var vi   = 0;
    var qty  = 1;

    /* Both controls repaint the price box, so size and quantity are always
       reflected in the figure on screen. */
    function repaint() {
      var box = byId('priceBox');
      if (box) box.innerHTML = priceBoxHtml(pool[vi], qty);
    }

    qa('#sizeRow .opt').forEach(function (o) {
      o.addEventListener('click', function () {
        qa('#sizeRow .opt').forEach(function (x) { x.classList.remove('on'); });
        o.classList.add('on');
        vi = parseInt(o.getAttribute('data-vi'), 10) || 0;
        repaint();
      });
    });
    qa('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () {
        qty = Math.max(1, qty + parseInt(b.getAttribute('data-q'), 10));
        qtyVal.textContent = qty;
        repaint();
      });
    });
    var addBtn = byId('addBtn');
    if (addBtn) addBtn.addEventListener('click', function () {
      if (!account) { promptSignup(); return; }
      addToCart(r.path[1], (pool[vi] || {}).title || '', qty);
    });
  }

  /* cart line controls */
  qa('[data-cq]').forEach(function (b) {
    b.addEventListener('click', function () {
      var key  = b.getAttribute('data-cq');
      var d    = b.getAttribute('data-d');
      var line = cart.filter(function (l) { return l.key === key; })[0];
      if (!line) return;
      setQty(key, d === 'x' ? 0 : Math.max(0, line.qty + parseInt(d, 10)));
    });
  });
  var place = byId('placeBtn');
  if (place) place.addEventListener('click', function () {
    var total = cartTotal();
    var names = BRANDS.filter(function (b) {
      return cart.some(function (l) { return (find(l.id) || {}).brandId === b.id; });
    }).map(function (b) { return b.short; });
    var who = names.length > 1
      ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] + ' have'
      : names[0] + ' has';
    openModal(
      '<h3>Order placed</h3>' +
      '<p>' + esc(who) + ' been notified and will dispatch within their stated lead times. ' +
      '<b>' + rupee(total) + '</b> plus GST is due 60 days after delivery — nothing is charged today.</p>' +
      '<button class="btn btn-ink btn-block btn-lg" id="okBtn">Done</button>'
    );
    byId('okBtn').addEventListener('click', function () {
      cart = []; save('befach.cart', cart); closeModal();
      syncChrome(); location.hash = '#/'; render();
    });
  });

  /* show more */
  var moreBtn = byId('moreBtn');
  if (moreBtn) moreBtn.addEventListener('click', function () {
    var next = paged.list.slice(paged.shown, paged.shown + PAGE_SIZE);
    byId('prodGrid').insertAdjacentHTML('beforeend', next.map(card).join(''));
    paged.shown += next.length;
    byId('moreCount').textContent = 'Showing ' + paged.shown + ' of ' + paged.list.length;
    if (paged.shown >= paged.list.length) moreBtn.parentNode.removeChild(moreBtn);
  });

  /* signup */
  var form = byId('joinForm');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    signIn(byId('shop').value.trim(), byId('city').value.trim());
    location.hash = '#/browse';
  });
  var out = byId('signOutBtn');
  if (out) out.addEventListener('click', signOut);
}

function assign(params, key, val) {
  var next = {};
  Object.keys(params).forEach(function (k) { next[k] = params[k]; });
  if (val) next[key] = val; else delete next[key];
  return next;
}
function go(params) {
  var qs = Object.keys(params).filter(function (k) { return params[k]; })
    .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
  location.hash = '#/browse' + (qs ? '?' + qs : '');
}

/* ---------------- global search ---------------- */
var searchTimer;
byId('q').addEventListener('input', function (e) {
  clearTimeout(searchTimer);
  var v = e.target.value;
  searchTimer = setTimeout(function () {
    location.hash = '#/browse' + (v.trim() ? '?q=' + encodeURIComponent(v.trim()) : '');
  }, 260);
});

byId('q').placeholder = 'Search ' + PRODUCTS.length + ' products from ' + BRANDS.length + ' Indian makers…';

/* Delegated so cards appended by Show more work without rebinding. */
document.addEventListener('click', function (e) {
  var btn = e.target && e.target.closest ? e.target.closest('[data-add]') : null;
  if (!btn) return;
  var p = find(btn.getAttribute('data-add'));
  if (p) addToCart(p.slug, defaultVariant(p).title || '', 1);
});

/* ---------------- boot ---------------- */
window.BefachUI = { closeModal: closeModal, signIn: signIn };
window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
window.addEventListener('scroll', drift, { passive: true });
window.addEventListener('resize', drift);
render();

})();
