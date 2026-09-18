/*! IQWealth widget · https://iraqsm.com/widget
 *  Drop-in card with the Baghdad dollar rate, gold and the ISX60 from
 *  iraqsm.com's open data. Free to embed; keep the attribution link.
 *
 *  <script src="https://iraqsm.com/widget.js" data-show="fx,gold,index" data-lang="ar" data-theme="auto"></script>
 */
(function () {
  'use strict';
  var script = document.currentScript;
  if (!script || !script.parentNode) return;
  var ORIGIN = 'https://iraqsm.com';
  var show = (script.getAttribute('data-show') || 'fx,gold,index').split(',').map(function (s) { return s.trim(); });
  var lang = (script.getAttribute('data-lang') || 'ar') === 'en' ? 'en' : 'ar';
  var theme = script.getAttribute('data-theme') || 'auto';
  var width = script.getAttribute('data-width') || '320px';

  var T = {
    ar: { fx: 'الدولار في بغداد', buy: 'شراء', sell: 'بيع', official: 'الرسمي', gold: 'الذهب عيار 21', mithqal: 'المثقال', gram: 'الغرام', index: 'مؤشر ISX60', value: 'التداول', asOf: 'بتاريخ', by: 'المصدر', more: 'التفاصيل', iqd: 'د.ع', loading: 'جارٍ التحميل…', failed: 'تعذّر التحميل' },
    en: { fx: 'Dollar in Baghdad', buy: 'Buy', sell: 'Sell', official: 'Official', gold: 'Gold 21k', mithqal: 'Mithqal', gram: 'Gram', index: 'ISX60 index', value: 'Turnover', asOf: 'as of', by: 'Source', more: 'Details', iqd: 'IQD', loading: 'Loading…', failed: 'Could not load' }
  }[lang];
  var nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  var nf2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

  var host = document.createElement('div');
  host.className = 'iqw-widget';
  script.parentNode.insertBefore(host, script);
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var css = '' +
    ':host{all:initial;display:block}' +
    '.w{box-sizing:border-box;width:' + width + ';max-width:100%;font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Naskh Arabic",sans-serif;border:1px solid var(--b);border-radius:12px;background:var(--bg);color:var(--ink);padding:12px 14px;direction:' + (lang === 'ar' ? 'rtl' : 'ltr') + '}' +
    '.w[data-t=light]{--bg:#F5F2EC;--ink:#1A2035;--mut:#5b6170;--b:#d9d5cc;--up:#1f6b45;--down:#a4402f;--blue:#2f5fd0}' +
    '.w[data-t=dark]{--bg:#0F1218;--ink:#E7E7E2;--mut:#9a9da6;--b:#2a2f3a;--up:#4fb37f;--down:#e07a68;--blue:#7fa2ff}' +
    '.r{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:7px 0;border-bottom:1px solid var(--b)}' +
    '.r:last-of-type{border-bottom:0}' +
    '.k{color:var(--mut);font-size:12px}.v{font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}' +
    '.s{color:var(--mut);font-size:11px;font-variant-numeric:tabular-nums}' +
    '.up{color:var(--up)}.down{color:var(--down)}' +
    '.f{display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:11px;color:var(--mut)}' +
    '.f a{color:var(--blue);text-decoration:none;font-weight:600}.f a:hover{text-decoration:underline}';

  var box = document.createElement('div');
  box.className = 'w';
  var t = theme === 'auto' ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
  box.setAttribute('data-t', t === 'dark' ? 'dark' : 'light');
  var style = document.createElement('style');
  style.textContent = css;
  root.appendChild(style);
  root.appendChild(box);
  box.innerHTML = '<div class="s">' + T.loading + '</div>';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function row(k, v, s, href) {
    return '<div class="r"><div><div class="k">' + esc(k) + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>' +
      '<a class="v" href="' + href + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">' + v + '</a></div>';
  }
  function get(kind) { return fetch(ORIGIN + '/data/' + kind + '.json', { cache: 'default' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }

  Promise.all([
    show.indexOf('fx') >= 0 ? get('fx') : null,
    show.indexOf('gold') >= 0 ? get('gold') : null,
    show.indexOf('index') >= 0 ? get('index') : null
  ]).then(function (d) {
    var fx = d[0], gold = d[1], idx = d[2], html = '', asOf = null;
    if (fx && fx.parallel) {
      var mid = fx.parallel.sell || fx.parallel.buy;
      html += row(T.fx, nf0.format(mid) + ' <span class="s">' + T.iqd + '</span>',
        T.buy + ' ' + nf0.format(fx.parallel.buy) + ' · ' + T.sell + ' ' + nf0.format(fx.parallel.sell) + ' · ' + T.official + ' ' + nf0.format(fx.official.cbi), ORIGIN + '/fx');
      asOf = fx.asOf;
    }
    if (gold && gold.gramByCarat) {
      var k21 = null; for (var i = 0; i < gold.gramByCarat.length; i++) if (gold.gramByCarat[i].karat === 21) k21 = gold.gramByCarat[i];
      if (k21) html += row(T.gold, nf0.format(k21.mithqalIqd) + ' <span class="s">' + T.iqd + '</span>', T.mithqal + ' · ' + T.gram + ' ' + nf0.format(k21.iqd), ORIGIN + '/gold');
    }
    if (idx && idx.sessions && idx.sessions.length) {
      var s0 = idx.sessions[0], s1 = idx.sessions[1], chg = '';
      if (s1 && s1.isx60) { var p = (s0.isx60 - s1.isx60) / s1.isx60 * 100; chg = '<span class="' + (p > 0 ? 'up' : p < 0 ? 'down' : '') + '">' + (p > 0 ? '+' : '') + nf2.format(p) + '%</span>'; }
      html += row(T.index, nf2.format(s0.isx60) + (chg ? ' <span class="s">' + chg + '</span>' : ''), T.value + ' ' + nf0.format(s0.valueIqd / 1e9) + (lang === 'ar' ? ' مليار د.ع' : ' bn IQD'), ORIGIN + '/');
      asOf = asOf || s0.date;
    }
    if (!html) { box.innerHTML = '<div class="s">' + T.failed + '</div>'; return; }
    html += '<div class="f"><span>' + (asOf ? T.asOf + ' ' + esc(asOf) : '') + '</span><span>' + T.by + ' <a href="' + ORIGIN + '/?utm_source=widget" target="_blank" rel="noopener">IQWealth</a></span></div>';
    box.innerHTML = html;
  });
})();
