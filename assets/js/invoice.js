/* NAQSH — invoice modal + real PDF download (account & booking pages) */
(function () {
  'use strict';
  var N = window.NAQSH, D = window.NAQSH_DATA, t = N.t;
  // html2pdf is ~900KB, so it is loaded only when a guest actually downloads an invoice.
  var LIB = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  var SRI = 'sha384-Yv5O+t3uE3hunW8uyrbpPW3iw6/5/Y7HitWJBLgqfMoA36NogMmy+8wWZMpn3HWc';
  var QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
  var QR_SRI = 'sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1';
  var libs = {}, current = null;

  function find(code) { return N.store.get('naqsh.bookings', []).filter(function (x) { return x.code === code; })[0]; }
  function number(b) { return 'INV-' + b.code.slice(3); }

  function loadScript(src, sri, name) {
    if (window[name]) return Promise.resolve(window[name]);
    if (!libs[src]) libs[src] = new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = src; s.integrity = sri; s.crossOrigin = 'anonymous';
      s.onload = function () { window[name] ? ok(window[name]) : fail(new Error(name)); };
      s.onerror = function () { delete libs[src]; fail(new Error(name)); };
      document.head.appendChild(s);
    });
    return libs[src];
  }

  // QR holds the booking summary as plain text: reception reads it with any phone camera, no app needed.
  function qrText(b) {
    var d = function (s) { return s.split('-').reverse().join('.'); };
    return ['NAQSH Heritage & Smart Hotel', number(b), b.code, d(b.in) + ' - ' + d(b.out),
      b.guest.first + ' ' + b.guest.last, Math.round(b.total) + ' UZS', location.origin].join('\n');
  }
  function qr(b) {
    return loadScript(QR_LIB, QR_SRI, 'qrcode').then(function (qrcode) {
      qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      var q = qrcode(0, 'M');
      q.addData(qrText(b));
      q.make();
      return q.createDataURL(6, 0);
    });
  }
  // Fills every <img data-qr> inside root; the block hides itself if the library can't load.
  function fillQr(root, b) {
    var imgs = [].slice.call(root.querySelectorAll('img[data-qr]'));
    if (!imgs.length) return Promise.resolve();
    return qr(b).then(function (src) {
      imgs.forEach(function (i) { i.src = src; });
    }).catch(function (err) {
      console.error(err);
      imgs.forEach(function (i) { i.closest('.qr').hidden = true; });
    });
  }
  function qrBlock() { return '<figure class="qr"><img data-qr alt="QR"><figcaption>' + t('inv.qr') + '</figcaption></figure>'; }

  function html(b) {
    var r = N.room(b.room), c = D.contact;
    var rows = '<tr><td>' + N.esc(N.L(r.name)) + ' — ' + N.fmtDate(b.in) + ' — ' + N.fmtDate(b.out) + '</td><td>' + b.nights + '</td><td>' + N.money(r.price) + '</td><td>' + N.money(b.roomTotal) + '</td></tr>';
    if (b.discount) rows += '<tr><td>' + t('q.early') + '</td><td>1</td><td></td><td>−' + N.money(b.discount) + '</td></tr>';
    (b.extras || []).forEach(function (id) {
      var x = D.extras.filter(function (e) { return e.id === id; })[0]; if (!x) return;
      rows += '<tr><td>' + N.esc(N.L(x.name)) + '</td><td>1</td><td>' + N.money(x.price) + '</td><td>' + N.money(x.price) + '</td></tr>';
    });
    return '<div class="inv-head"><div><h2>' + t('inv.title') + '</h2><p style="margin:0;color:var(--muted)">№ ' + number(b) + ' · ' + N.fmtDate(b.created.slice(0, 10)) + '</p></div><img src="assets/img/logo-sm.png" alt="NAQSH"></div>' +
      '<div class="inv-meta"><div><b>' + t('inv.seller') + '</b>' + t('inv.company') + '<br>' + N.esc(N.L(c.address)) + '<br>' + t('inv.tin') + ': ___________<br>' + c.phone + '</div>' +
      '<div><b>' + t('inv.buyer') + '</b>' + N.esc(b.guest.first + ' ' + b.guest.last) + '<br>' + N.esc(b.guest.email) + '<br>' + N.esc(b.guest.phone || '') + '<br>' + t('bk.code') + ': ' + b.code + '</div></div>' +
      '<table class="table"><thead><tr><th>' + t('inv.item') + '</th><th>' + t('inv.qty') + '</th><th>' + t('inv.price') + '</th><th>' + t('inv.sum') + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="inv-total"><table><tr><td>' + t('q.net') + '</td><td>' + N.money(b.net) + '</td></tr><tr><td>' + t('q.vat') + '</td><td>' + N.money(b.vat) + '</td></tr><tr><td>' + t('q.total') + '</td><td>' + N.money(b.total) + '</td></tr></table></div>' +
      '<div class="inv-bottom"><p class="inv-foot">' + t('inv.paidBy', { m: b.method.toUpperCase() + ' •••• ' + b.last4 }) + (b.status === 'cancelled' ? ' · ' + t('st.cancelled') : '') + '<br>' + t('inv.note') + '</p>' + qrBlock() + '</div>';
  }

  function modal() {
    var m = document.getElementById('inv-modal');
    if (m) return m;
    m = document.createElement('div');
    m.className = 'modal'; m.id = 'inv-modal';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="modal-box"><div class="modal-actions"><button class="btn btn--gold btn--sm" type="button" id="inv-download"></button><button class="btn btn--ghost btn--sm" type="button" id="inv-close"></button></div><div class="invoice" id="invoice"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.getElementById('inv-close').addEventListener('click', close);
    document.getElementById('inv-download').addEventListener('click', function () { if (current) download(current); });
    return m;
  }

  function open(b) {
    if (typeof b === 'string') b = find(b);
    if (!b) return;
    current = b;
    var m = modal();
    document.getElementById('inv-download').innerHTML = N.icon('file') + t('inv.download');
    document.getElementById('inv-close').textContent = t('acc.close');
    var box = document.getElementById('invoice');
    box.innerHTML = html(b);
    fillQr(box, b);
    m.classList.add('is-open');
  }
  function close() { var m = document.getElementById('inv-modal'); if (m) m.classList.remove('is-open'); }

  // Browser print dialog: last resort when the PDF library can't load (offline, blocked CDN).
  function printFallback() {
    document.body.classList.add('printing');
    try { window.print(); } catch (e) { /* in-app browsers without print */ }
    setTimeout(function () { document.body.classList.remove('printing'); }, 500);
  }

  function download(b) {
    var btn = document.getElementById('inv-download');
    if (btn.disabled) return;
    btn.disabled = true;
    var label = btn.innerHTML;
    btn.textContent = '…';
    // Detached copy: html2pdf sizes it to the A4 width; .is-pdf keeps the two-column layout on phones.
    var el = document.createElement('div');
    el.className = 'invoice is-pdf';
    el.innerHTML = html(b);
    // A desktop scrollbar shifts the capture sideways, so the page doesn't scroll while rendering.
    var root = document.documentElement, overflow = root.style.overflow;
    Promise.all([loadScript(LIB, SRI, 'html2pdf'), fillQr(el, b)]).then(function (r) {
      var h2p = r[0];
      root.style.overflow = 'hidden';
      return h2p().set({
        margin: 10,
        filename: number(b) + '.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(el).save();
    }).catch(function (err) {
      console.error(err);
      printFallback();
    }).then(function () { root.style.overflow = overflow; btn.disabled = false; btn.innerHTML = label; });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-inv]');
    if (el) { e.preventDefault(); open(el.getAttribute('data-inv')); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  window.NAQSH_INVOICE = { html: html, open: open, close: close, download: download, qrBlock: qrBlock, fillQr: fillQr };
})();
