/* NAQSH — shared site logic: i18n, layout, booking widget, quick help, lightbox */
(function () {
  'use strict';
  var D = window.NAQSH_DATA, T = window.NAQSH_I18N;
  var LANGS = ['uz', 'ru', 'en'];
  var STORE = 'naqsh.lang';

  /* ---------- storage (never throws) ---------- */
  var store = {
    get: function (k, def) { try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- language detection: ?lang → saved → browser ---------- */
  function detectLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (LANGS.indexOf(q) > -1) { store.set(STORE, q); return q; }
    var saved = store.get(STORE);
    if (LANGS.indexOf(saved) > -1) return saved;
    var list = navigator.languages || [navigator.language || 'en'];
    for (var i = 0; i < list.length; i++) {
      var c = String(list[i]).toLowerCase().slice(0, 2);
      if (c === 'uz') return 'uz';
      if (['ru', 'kk', 'ky', 'tg', 'be', 'uk', 'az', 'tk'].indexOf(c) > -1) return 'ru';
      if (c === 'en') return 'en';
    }
    return 'en';
  }

  var lang = detectLang();
  var renderers = [];

  function t(key, vars) {
    var e = T[key], s = e ? (e[lang] != null ? e[lang] : e.en) : key;
    if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  function L(obj) { return obj ? (obj[lang] != null ? obj[lang] : obj.en) : ''; }
  function money(n) {
    var s = new Intl.NumberFormat('ru-RU').format(Math.round(n)).replace(/ | /g, ' ');
    return lang === 'en' ? 'UZS ' + s : s + ' ' + t('cur');
  }
  function img(name, small) { return 'assets/img/' + name + (small ? '-sm' : '') + '.webp'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function room(id) { for (var i = 0; i < D.rooms.length; i++) if (D.rooms[i].id === id) return D.rooms[i]; return null; }

  /* ---------- dates ---------- */
  function iso(d) { var z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }
  function addDays(s, n) { var d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function nights(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }
  function fmtDate(s) {
    // Browsers render uz-Latn as "2026 M10 25", so Uzbek months are spelled out by hand.
    if (lang === 'uz') {
      var p = String(s).split('-'), m = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'][+p[1] - 1];
      return m ? +p[2] + '-' + m + ', ' + p[0] : s;
    }
    var loc = { ru: 'ru-RU', en: 'en-GB' }[lang];
    try { return new Date(s + 'T12:00:00').toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return s; }
  }
  function today() { return iso(new Date()); }

  /* ---------- price breakdown (VAT included in published rate) ---------- */
  function quote(r, checkIn, checkOut, extras) {
    var n = Math.max(1, nights(checkIn, checkOut));
    var early = (new Date(checkIn + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 864e5 >= 30;
    var roomTotal = r.price * n;
    var discount = early ? Math.round(roomTotal * 0.10) : 0;
    var extrasTotal = 0;
    (extras || []).forEach(function (id) { D.extras.forEach(function (x) { if (x.id === id) extrasTotal += x.price; }); });
    var total = roomTotal - discount + extrasTotal;
    var vat = Math.round(total * D.vatRate / (1 + D.vatRate));
    return { nights: n, roomTotal: roomTotal, discount: discount, extrasTotal: extrasTotal, total: total, vat: vat, net: total - vat, early: early };
  }

  /* Demo availability — deterministic per date range; replaced by PMS / Channel Manager API. */
  function availability(r, checkIn, checkOut) {
    var min = r.count, n = Math.max(1, nights(checkIn, checkOut));
    for (var i = 0; i < n; i++) {
      var d = addDays(checkIn, i), h = 0;
      for (var j = 0; j < d.length; j++) h = (h * 31 + d.charCodeAt(j) + r.id.length * 7) % 9973;
      var booked = Math.floor((h % 100) / 100 * (r.count + 1) * 0.92);
      min = Math.min(min, r.count - booked);
    }
    return Math.max(0, min);
  }

  /* ---------- icons ---------- */
  var P = {
    bed: '<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M3 18v2M21 18v2M7 9V6h10v3"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    area: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>',
    tv: '<rect x="2.5" y="4" width="19" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/>',
    desk: '<path d="M3 8h18M5 8v12M19 8v12M5 13h6v7"/><path d="M14 4h4v4h-4z"/>',
    ac: '<path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1L19.1 4.9"/>',
    shower: '<path d="M4 21V6a3 3 0 0 1 6 0v1M8 7h6M9 11v1M12 11v1M15 11v1M9 15v1M12 15v1M15 15v1"/>',
    bath: '<path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM6 12V5a2 2 0 0 1 4 0M7 20l-1 2M17 20l1 2"/>',
    safe: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v1M12 15v1M16 12h-1M9 12H8"/>',
    kettle: '<path d="M5 20h12M6 20l1-10h8l1 10M9 10V7a3 3 0 0 1 6 0v3M16 12h2a2 2 0 0 1 0 4h-1.5"/>',
    coffee: '<path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6zM17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 2v3M12 2v3"/>',
    minibar: '<rect x="5" y="2.5" width="14" height="19" rx="1.5"/><path d="M5 9h14M8 5.5v1.5M8 12v3"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    view: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    kids: '<circle cx="12" cy="6" r="3"/><path d="M8 22v-6l-3-3 3-3h8l3 3-3 3v6"/>',
    sofa: '<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2zM5 18v2M19 18v2"/>',
    heritage: '<path d="M12 2c3 2.5 5 4.5 5 8v12H7V10c0-3.5 2-5.5 5-8zM12 9c1.2 1 2 2 2 3.5S13 15 12 16c-1-1-2-2-2-3.5S10.8 10 12 9z"/>',
    star8: '<path d="M12 2l2.6 6.4L21 11l-6.4 2.6L12 20l-2.6-6.4L3 11l6.4-2.6z"/>',
    pattern: '<path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><circle cx="12" cy="12" r="2"/>',
    smart: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/><path d="M9.5 9.5a3.5 3.5 0 0 1 5 0M8 7.5a6 6 0 0 1 8 0"/>',
    breakfast: '<path d="M3 11h18a9 9 0 0 1-18 0zM7 4c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3M17 4c0 1.5 1 1.5 1 3"/>',
    laptop: '<rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
    receipt: '<path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2zM9 7h6M9 11h6M9 15h4"/>',
    car: '<path d="M5 16l1.5-6A2 2 0 0 1 8.4 8.5h7.2a2 2 0 0 1 1.9 1.5L19 16M3 16h18v4H3zM6.5 20v1.5M17.5 20v1.5"/><circle cx="7" cy="18" r=".6"/><circle cx="17" cy="18" r=".6"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>',
    laundry: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 6h.01M11 6h3"/>',
    shop: '<path d="M4 8h16l-1 13H5zM8 8V6a4 4 0 0 1 8 0v2"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="1.5"/><path d="M3 6l9 7 9-7"/>',
    pin: '<path d="M12 22s7-7.1 7-12.5a7 7 0 0 0-14 0C5 14.9 12 22 12 22z"/><circle cx="12" cy="9.5" r="2.5"/>',
    chat: '<path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1z"/><path d="M8 9h8M8 12.5h5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M3 7h18M3 12h18M3 17h12"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.01"/>',
    shield: '<path d="M12 2.5l8 3v6c0 5-3.5 8.6-8 10-4.5-1.4-8-5-8-10v-6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="17" rx="1.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
    file: '<path d="M6 2.5h8l5 5V21.5H6z"/><path d="M14 2.5v5h5M9 13h7M9 17h5"/>',
    logout: '<path d="M10 4H5v16h5M16 8l4 4-4 4M20 12H9"/>',
    images: '<rect x="3" y="3" width="18" height="18" rx="1.5"/><circle cx="9" cy="9" r="2"/><path d="M21 16l-5-5-9 10"/>',
    whatsapp: '<path d="M3.5 20.5l1.3-4.4A8.8 8.8 0 1 1 8 19.3z"/><path d="M9 8.5c0 3.6 2.9 6.5 6.5 6.5l1-1.6-2-1-1 .8c-1.2-.5-2.2-1.5-2.7-2.7l.8-1-1-2z"/>',
    telegram: '<path d="M21.5 3.5L2.5 11l6 2.2M21.5 3.5l-3 17-8-6.3M21.5 3.5l-13 9.7v6.3l3-3.7"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.01"/>',
  };
  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.star8) + '</svg>';
  }

  /* ---------- layout ---------- */
  var NAV = [['rooms.html', 'nav.rooms'], ['services.html', 'nav.services'], ['gallery.html', 'nav.gallery'], ['contacts.html', 'nav.contacts']];
  var page = location.pathname.split('/').pop() || 'index.html';
  if (page === 'room.html') page = 'rooms.html';

  function langSwitch() {
    return '<div class="lang-switch" role="group" aria-label="Language">' + LANGS.map(function (l) {
      return '<button type="button" data-lang="' + l + '" aria-pressed="' + (l === lang) + '">' + l.toUpperCase() + '</button>';
    }).join('') + '</div>';
  }
  function navLinks() {
    return NAV.map(function (n) { return '<a href="' + n[0] + '"' + (page === n[0] ? ' aria-current="page"' : '') + '>' + t(n[1]) + '</a>'; }).join('');
  }

  function renderHeader() {
    var h = document.getElementById('site-header');
    if (!h) { h = document.createElement('header'); h.id = 'site-header'; h.className = 'site-header'; document.body.insertBefore(h, document.body.firstChild); }
    h.innerHTML =
      '<div class="container">' +
        '<a class="brand" href="index.html" aria-label="NAQSH — ' + esc(t('nav.home')) + '"><img src="assets/img/emblem.webp" alt="" width="54" height="42"><span class="brand-text"><span class="brand-name">NAQSH</span><span class="brand-sub">Heritage &amp; Smart Hotel</span></span></a>' +
        '<nav class="nav" aria-label="Main">' + navLinks() + '</nav>' +
        '<div class="header-actions">' + langSwitch() +
          '<a class="icon-btn" href="account.html" aria-label="' + esc(t('nav.account')) + '" title="' + esc(t('nav.account')) + '">' + icon('user') + '</a>' +
          '<a class="btn btn--gold header-book" href="booking.html">' + t('nav.book') + '</a>' +
          '<button class="icon-btn burger" type="button" aria-label="Menu" aria-expanded="false">' + icon('menu') + '</button>' +
        '</div>' +
      '</div>';
    var d = document.getElementById('drawer');
    if (!d) { d = document.createElement('div'); d.id = 'drawer'; d.className = 'drawer'; d.setAttribute('aria-hidden', 'true'); document.body.appendChild(d); }
    d.innerHTML =
      '<div class="drawer-top"><a class="brand" href="index.html"><span class="brand-text"><span class="brand-name">NAQSH</span><span class="brand-sub">Heritage &amp; Smart Hotel</span></span></a>' +
      '<button class="icon-btn" type="button" data-close-drawer aria-label="Close">' + icon('close') + '</button></div>' +
      '<nav>' + '<a href="index.html">' + t('nav.home') + '</a>' + navLinks() + '<a href="policies.html">' + t('nav.policies') + '</a><a href="account.html">' + t('nav.account') + '</a></nav>' +
      langSwitch() + '<a class="btn btn--gold btn--block" href="booking.html">' + t('nav.book') + '</a>';
  }

  function renderFooter() {
    var f = document.getElementById('site-footer');
    if (!f) { f = document.createElement('footer'); f.id = 'site-footer'; f.className = 'site-footer'; document.body.appendChild(f); }
    var c = D.contact, y = new Date().getFullYear();
    f.innerHTML =
      '<div class="container"><div class="footer-grid">' +
        '<div class="footer-brand"><img src="assets/img/logo-sm.webp" alt="NAQSH Heritage & Smart Hotel" width="150" height="150" loading="lazy"><p>' + t('footer.about') + '</p></div>' +
        '<div><h4>' + t('footer.explore') + '</h4><ul>' +
          '<li><a href="rooms.html">' + t('nav.rooms') + '</a></li><li><a href="services.html">' + t('nav.services') + '</a></li>' +
          '<li><a href="gallery.html">' + t('nav.gallery') + '</a></li><li><a href="booking.html">' + t('nav.book') + '</a></li><li><a href="account.html">' + t('nav.account') + '</a></li></ul></div>' +
        '<div><h4>' + t('footer.info') + '</h4><ul>' +
          '<li><a href="policies.html#cancellation">' + t('pol.cancel') + '</a></li><li><a href="policies.html#privacy">' + t('pol.privacy') + '</a></li>' +
          '<li><a href="policies.html#terms">' + t('pol.terms') + '</a></li><li><a href="policies.html#house">' + t('pol.house') + '</a></li></ul></div>' +
        '<div><h4>' + t('footer.contact') + '</h4><ul>' +
          '<li>' + esc(L(c.address)) + '</li><li><a href="' + c.phoneHref + '">' + c.phone + '</a></li><li><a href="mailto:' + c.email + '">' + c.email + '</a></li>' +
          '<li><a href="' + c.whatsapp + '" target="_blank" rel="noopener">WhatsApp</a> · <a href="' + c.telegram + '" target="_blank" rel="noopener">Telegram</a> · <a href="' + c.instagram + '" target="_blank" rel="noopener">Instagram</a></li></ul>' +
          '<div class="pay-badges" aria-label="' + esc(t('footer.pay')) + '"><span>UZCARD</span><span>HUMO</span><span>VISA</span><span>MASTERCARD</span></div></div>' +
      '</div>' +
      '<div class="footer-bottom"><span>© ' + y + ' NAQSH Heritage &amp; Smart Hotel. ' + t('footer.rights') + '</span><span>' + t('footer.photos') + '</span></div></div>';
  }

  function renderFab() {
    var f = document.getElementById('fab');
    if (!f) { f = document.createElement('div'); f.id = 'fab'; f.className = 'fab'; document.body.appendChild(f); }
    var c = D.contact;
    f.innerHTML =
      '<div class="fab-panel" id="fab-panel" role="dialog" aria-label="' + esc(t('fab.title')) + '">' +
        '<div class="fab-head"><b>' + t('fab.title') + '</b><small><i></i>' + t('fab.sla') + '</small></div>' +
        '<div class="fab-links">' +
          '<a href="' + c.whatsapp + '" target="_blank" rel="noopener"><span class="ic" style="background:#1f9d57">' + icon('whatsapp') + '</span><span>WhatsApp<small>' + t('fab.wa') + '</small></span></a>' +
          '<a href="' + c.telegram + '" target="_blank" rel="noopener"><span class="ic" style="background:#2a8bc9">' + icon('telegram') + '</span><span>Telegram<small>' + t('fab.tg') + '</small></span></a>' +
          '<a href="' + c.phoneHref + '"><span class="ic" style="background:var(--navy-800)">' + icon('phone') + '</span><span>' + c.phone + '<small>' + t('fab.call') + '</small></span></a>' +
        '</div></div>' +
      '<button class="fab-toggle" type="button" aria-expanded="false" aria-controls="fab-panel" aria-label="' + esc(t('fab.title')) + '">' + icon('chat') + '</button>';
  }

  /* ---------- static i18n ---------- */
  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    document.querySelectorAll('[data-icon]').forEach(function (el) { if (!el.querySelector('svg')) el.insertAdjacentHTML('afterbegin', icon(el.getAttribute('data-icon'))); });
    var tk = document.body.getAttribute('data-title');
    if (tk) document.title = t(tk) + ' — NAQSH Heritage & Smart Hotel';
    var dk = document.body.getAttribute('data-desc'), md = document.querySelector('meta[name="description"]');
    if (dk && md) md.setAttribute('content', t(dk));
  }

  function renderAll() {
    renderHeader(); renderFooter(); renderFab(); applyStatic();
    renderers.forEach(function (fn) { fn(); });
    observeReveal();
  }

  function setLang(l) {
    if (LANGS.indexOf(l) < 0 || l === lang) return;
    lang = l; store.set(STORE, l);
    var u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(null, '', u);
    renderAll();
  }

  /* ---------- interactions (delegated) ---------- */
  function openDrawer(open) {
    var d = document.getElementById('drawer'), b = document.querySelector('.burger');
    d.classList.toggle('is-open', open); d.setAttribute('aria-hidden', String(!open));
    if (b) b.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-lang]'); if (el) { setLang(el.getAttribute('data-lang')); return; }
    if (e.target.closest('.burger')) { openDrawer(true); return; }
    if (e.target.closest('[data-close-drawer]') || e.target.closest('.drawer nav a')) { openDrawer(false); }
    var ft = e.target.closest('.fab-toggle');
    var fab = document.getElementById('fab');
    if (ft) { var open = !fab.classList.contains('is-open'); fab.classList.toggle('is-open', open); ft.setAttribute('aria-expanded', String(open)); return; }
    if (fab && fab.classList.contains('is-open') && !e.target.closest('#fab')) { fab.classList.remove('is-open'); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { openDrawer(false); var f = document.getElementById('fab'); if (f) f.classList.remove('is-open'); closeLightbox(); }
  });

  function onScroll() {
    var h = document.getElementById('site-header');
    if (h) h.classList.toggle('is-solid', window.scrollY > 40);
    // Fallback for when IntersectionObserver is throttled: never leave passed content hidden.
    var lim = window.innerHeight * 0.95;
    document.querySelectorAll('.reveal:not(.is-in)').forEach(function (el) { if (el.getBoundingClientRect().top < lim) el.classList.add('is-in'); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- reveal on scroll ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting || en.boundingClientRect.top < 0) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  function observeReveal() {
    document.querySelectorAll('.reveal:not(.is-in)').forEach(function (el) { if (io) io.observe(el); else el.classList.add('is-in'); });
  }

  /* ---------- booking widget (home, room page) ---------- */
  function bookingWidget(target, opts) {
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    var a = today(), b = addDays(a, 1);
    var prev = el.querySelector('form') ? new FormData(el.querySelector('form')) : null;
    var v = { in: prev ? prev.get('in') : addDays(a, 7), out: prev ? prev.get('out') : addDays(a, 9), adults: prev ? prev.get('adults') : '2', room: prev ? prev.get('room') : (opts && opts.room) || '' };
    var opt = function (val, label, sel) { return '<option value="' + val + '"' + (String(sel) === String(val) ? ' selected' : '') + '>' + label + '</option>'; };
    el.innerHTML =
      '<form class="book-widget" action="booking.html" method="get" novalidate>' +
        '<div class="bw-field"><label for="bw-in">' + t('bw.in') + '</label><input id="bw-in" type="date" name="in" min="' + a + '" value="' + v.in + '" required></div>' +
        '<div class="bw-field"><label for="bw-out">' + t('bw.out') + '</label><input id="bw-out" type="date" name="out" min="' + b + '" value="' + v.out + '" required></div>' +
        '<div class="bw-field"><label for="bw-ad">' + t('bw.guests') + '</label><select id="bw-ad" name="adults">' +
          [1, 2, 3, 4].map(function (n) { return opt(n, n + ' ' + t(n === 1 ? 'bw.adult' : 'bw.adults'), v.adults); }).join('') + '</select></div>' +
        '<div class="bw-field"><label for="bw-room">' + t('bw.room') + '</label><select id="bw-room" name="room">' + opt('', t('bw.anyRoom'), v.room) +
          D.rooms.map(function (r) { return opt(r.id, L(r.name), v.room); }).join('') + '</select></div>' +
        '<button class="btn btn--gold" type="submit">' + t('bw.search') + ' ' + icon('arrow') + '</button>' +
      '</form>';
    var f = el.querySelector('form'), i = f.elements['in'], o = f.elements['out'];
    i.addEventListener('change', function () {
      o.min = addDays(i.value, 1);
      if (!o.value || o.value <= i.value) o.value = addDays(i.value, 1);
    });
    f.addEventListener('submit', function (e) {
      if (!i.value || !o.value || o.value <= i.value) { e.preventDefault(); toast(t('bw.invalid')); return; }
      var lg = document.createElement('input'); lg.type = 'hidden'; lg.name = 'lang'; lg.value = lang; f.appendChild(lg);
    });
  }

  /* ---------- room card ---------- */
  function roomCard(r) {
    return '<article class="room-card reveal">' +
      '<a class="room-card-media" href="room.html?type=' + r.id + '"><img src="' + img(r.img, true) + '" alt="' + esc(L(r.name)) + '" loading="lazy" width="800" height="533"><span class="tag">' + r.count + ' ' + t('rooms.units') + '</span></a>' +
      '<div class="room-card-body"><h3><a href="room.html?type=' + r.id + '">' + esc(L(r.name)) + '</a></h3>' +
      '<div class="room-meta"><span>' + icon('area') + r.area + ' m²</span><span>' + icon('users') + t('rooms.upTo', { n: r.guests }) + '</span></div>' +
      '<p>' + esc(L(r.short)) + '</p>' +
      '<div class="room-card-foot"><div class="price"><small>' + t('price.from') + '</small><b>' + money(r.price) + '</b><em>' + t('price.perNightVat') + '</em></div>' +
      '<a class="link" href="room.html?type=' + r.id + '">' + t('rooms.details') + '</a></div></div></article>';
  }

  /* ---------- lightbox ---------- */
  var lb = { items: [], i: 0 };
  function ensureLightbox() {
    var el = document.getElementById('lightbox');
    if (el) return el;
    el = document.createElement('div'); el.id = 'lightbox'; el.className = 'lightbox'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<img alt=""><div class="lb-cap"></div>' +
      '<button class="icon-btn lb-close" type="button" aria-label="Close">' + icon('close') + '</button>' +
      '<button class="icon-btn lb-prev" type="button" aria-label="Previous">' + icon('left') + '</button>' +
      '<button class="icon-btn lb-next" type="button" aria-label="Next">' + icon('right') + '</button>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      if (e.target.closest('.lb-close') || e.target === el) closeLightbox();
      else if (e.target.closest('.lb-prev')) showLb(lb.i - 1);
      else if (e.target.closest('.lb-next')) showLb(lb.i + 1);
    });
    var x0 = null;
    el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) showLb(lb.i + (dx < 0 ? 1 : -1)); x0 = null; });
    document.addEventListener('keydown', function (e) {
      if (!el.classList.contains('is-open')) return;
      if (e.key === 'ArrowLeft') showLb(lb.i - 1); if (e.key === 'ArrowRight') showLb(lb.i + 1);
    });
    return el;
  }
  function showLb(i) {
    var el = ensureLightbox(), n = lb.items.length; lb.i = (i + n) % n;
    var it = lb.items[lb.i];
    el.querySelector('img').src = img(it.img); el.querySelector('img').alt = it.cap || '';
    el.querySelector('.lb-cap').textContent = (it.cap ? it.cap + ' · ' : '') + (lb.i + 1) + ' / ' + n;
  }
  function openLightbox(items, i) {
    lb.items = items; var el = ensureLightbox(); el.classList.add('is-open'); document.body.style.overflow = 'hidden'; showLb(i || 0);
    el.querySelector('.lb-close').focus();
  }
  function closeLightbox() {
    var el = document.getElementById('lightbox');
    if (el && el.classList.contains('is-open')) { el.classList.remove('is-open'); document.body.style.overflow = ''; }
  }

  /* ---------- toast ---------- */
  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('is-show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('is-show'); }, 3200);
  }

  /* ---------- public API ---------- */
  window.NAQSH = {
    get lang() { return lang; }, t: t, L: L, money: money, img: img, esc: esc, icon: icon, room: room,
    iso: iso, addDays: addDays, nights: nights, fmtDate: fmtDate, today: today, quote: quote, availability: availability,
    store: store, toast: toast, bookingWidget: bookingWidget, roomCard: roomCard, openLightbox: openLightbox,
    onRender: function (fn) { renderers.push(fn); }, rerender: renderAll
  };

  document.addEventListener('DOMContentLoaded', function () { renderAll(); onScroll(); });
})();
