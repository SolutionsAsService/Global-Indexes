/* Global Indexes: shared data loading and page chrome. No dependencies.
   Every printed figure is computed here from manifest.json, summary.json and the index files. */
(function () {
  'use strict';
  var REPO = 'https://github.com/SolutionsAsService/Global-Indexes';
  var NAV = [['countries', 'country.html', 'Country'], ['rankings', 'rankings.html', 'Rankings'], ['compare', 'compare.html', 'Compare'], ['about', 'about.html', 'Sources']];
  var TOPIC_ORDER = ['Governance', 'Wellbeing', 'Society', 'Safety']; // axis order on the landing chart

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function get(p) {
    return fetch(new URL(p, document.baseURI)).then(function (r) {
      if (!r.ok) throw new Error(p + ': HTTP ' + r.status);
      return r.json();
    });
  }
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function num(x) {
    if (x == null) return '';
    var a = Math.abs(x);
    return a >= 1000 ? Math.round(x).toLocaleString('en-US') : a >= 10 ? x.toFixed(1) : x.toFixed(2);
  }

  function chrome(active) {
    var h = document.createElement('header');
    h.className = 'site';
    h.innerHTML = '<a class="skip" href="#main">Skip to content</a><div class="wrap topbar"><a class="brand" href="index.html" aria-label="Global Indexes, home">Global<i>/</i>Indexes</a><nav aria-label="Main">' +
      NAV.map(function (n) { return '<a href="' + n[1] + '"' + (n[0] === active ? ' aria-current="page"' : '') + '>' + n[2] + '</a>'; }).join('') + '</nav></div>';
    document.body.insertBefore(h, document.body.firstChild);
    var f = document.createElement('footer');
    f.className = 'site';
    f.innerHTML = '<div class="wrap"><p id="foot-note"></p><p><a href="about.html">Sources and method</a> · <a href="' + REPO + '/issues">Report a mistake</a> · <a href="' + REPO + '">Source</a> · MIT licence</p></div>';
    document.body.appendChild(f);
  }

  var cache = {};
  function file(m) { return cache[m.file] || (cache[m.file] = get(m.file)); }

  // boot(active, fn): chrome, then manifest + summary, then fn(G).
  function boot(active, fn) {
    chrome(active);
    Promise.all([get('manifest.json'), get('summary.json')]).then(function (d) {
      var man = d[0].indexes, sum = d[1];
      var G = { manifest: man, summary: sum, esc: esc, $: $, $$: $$, ord: ord, num: num, file: file, get: get, param: param };
      G.verified = man.filter(function (m) { return m.verified; });
      G.byId = {}; man.forEach(function (m) { G.byId[m.id] = m; });
      G.axes = G.verified.slice().sort(function (a, b) { return TOPIC_ORDER.indexOf(a.topic) - TOPIC_ORDER.indexOf(b.topic); });
      G.countries = Object.keys(sum).sort();
      var ly = G.verified.map(function (m) { return m.last_year; }).sort();
      G.firstOfLast = ly[0]; G.lastOfLast = ly[ly.length - 1];
      var foot = $('#foot-note');
      if (foot) foot.textContent = 'Indexes as last published in the archive this site was built from: the newest data point is ' + G.lastOfLast + ' and the oldest index ends in ' + G.firstOfLast + '. Rank is computed here within each index and year.';
      $$('[data-fig]').forEach(function (el) {
        var k = el.getAttribute('data-fig');
        var cl = G.verified.map(function (m) { return m.countries_latest; });
        var v = { indexes: G.verified.length, countries: G.countries.length, minyear: G.firstOfLast, maxyear: G.lastOfLast, minc: Math.min.apply(null, cl), maxc: Math.max.apply(null, cl) }[k];
        if (v !== undefined) el.textContent = v;
      });
      fn(G);
    }).catch(function (err) {
      console.error(err);
      var m = $('#main'); if (m) m.insertAdjacentHTML('afterbegin', '<p class="notice" role="alert">The data could not be loaded (' + esc(err.message) + '). Serve this folder rather than opening the file, for example with <code>npx serve .</code>.</p>');
    });
  }
  function param(name) { return new URLSearchParams(location.search).get(name); }
  window.GI = { boot: boot, esc: esc, $: $, $$: $$, ord: ord, num: num, param: param };
})();
