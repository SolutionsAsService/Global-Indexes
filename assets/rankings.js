/* One index, one year: table, facts, and movers (change in position between the first and last year). */
GI.boot('rankings', function (G) {
  'use strict';
  var $ = G.$, esc = G.esc;
  var ixSel = $('#ix'), yrSel = $('#yr'), q = $('#q'), rows = $('#rows');
  var cur = G.byId[G.param('i')] || G.byId.corruption, data = null, sel = G.param('c') || '';
  ixSel.innerHTML = G.manifest.map(function (m) { return '<option value="' + m.id + '">' + esc(m.name) + (m.verified ? '' : ' (unverified)') + '</option>'; }).join('');

  function setIndex(m, year) {
    cur = m; ixSel.value = m.id;
    G.file(m).then(function (d) {
      data = d;
      yrSel.innerHTML = m.years.slice().reverse().map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
      yrSel.value = year || m.last_year;
      var u = new URL(location.href); u.searchParams.set('i', m.id); history.replaceState && history.replaceState(null, '', u);
      render();
    });
  }

  function pct(r, n) { return n > 1 ? 100 * (n - r) / (n - 1) : 100; }

  function render() {
    var m = cur, y = yrSel.value, term = q.value.trim().toLowerCase();
    $('#title').textContent = m.name;
    document.title = m.name + ' | Global Indexes';
    var list = Object.keys(data).filter(function (c) { return data[c][y]; }).map(function (c) { return { c: c, s: data[c][y].Score, r: data[c][y].Rank }; });
    var n = list.length;
    list.sort(function (a, b) { return m.verified ? (a.r - b.r || a.c.localeCompare(b.c)) : (b.s - a.s); });
    var lo = Math.min.apply(null, list.map(function (x) { return x.s; })), hi = Math.max.apply(null, list.map(function (x) { return x.s; }));
    $('#warn').innerHTML = m.verified ? '' : '<p class="warn"><b>Unverified file.</b> ' + esc(m.notes) + ' Ranks are not shown; the table is sorted by score.</p>';
    $('#th-rank').textContent = m.verified ? 'Rank' : '#';
    var shown = list.filter(function (x) { return !term || x.c.toLowerCase().indexOf(term) >= 0; });
    $('#count').textContent = shown.length + ' of ' + n + ' countries covered in ' + y + '. ' + (m.better === 'lower' ? 'Lower scores rank higher.' : 'Higher scores rank higher.') + ' Countries the index does not cover are not listed.';
    rows.innerHTML = shown.map(function (x, i) {
      var w = hi === lo ? 100 : 100 * Math.abs(x.s - (m.better === 'lower' ? hi : lo)) / (hi - lo);
      return '<tr' + (x.c === sel ? ' class="sel"' : '') + '><td class="n">' + (m.verified ? x.r : (list.indexOf(x) + 1)) + '</td><td><a href="country.html?c=' + encodeURIComponent(x.c) + '">' + esc(x.c) + '</a></td><td class="n">' + G.num(x.s) + '</td><td><span class="bar' + (x.c === sel ? ' hot' : '') + '"><i style="width:' + Math.max(2, w).toFixed(1) + '%"></i></span></td></tr>';
    }).join('');
    $('#facts').innerHTML =
      '<div><dt>What it measures</dt><dd>' + esc(m.notes) + '</dd></div>' +
      '<div><dt>Scale</dt><dd>' + esc(m.scale) + '</dd></div>' +
      '<div><dt>Source</dt><dd><a href="' + esc(m.source_url) + '">' + esc(m.source) + '</a></dd></div>' +
      '<div><dt>Coverage</dt><dd>' + m.countries_latest + ' countries in ' + m.last_year + '; ' + m.years.length + ' years from ' + m.first_year + ' to ' + m.last_year + (m.years.length < 10 ? ' (' + m.years.join(', ') + ')' : '') + '</dd></div>';
    movers(m);
  }

  // Movers: change in percentile position between the first and last year the country appears in, among countries present in both.
  function movers(m) {
    var ys = m.years, a = String(ys[0]), b = String(ys[ys.length - 1]);
    if (!m.verified || a === b) { $('#movers').innerHTML = ''; $('#mv-note').textContent = m.verified ? '' : 'Not computed for an unverified file.'; return; }
    var na = 0, nb = 0, both = [];
    Object.keys(data).forEach(function (c) { var v = data[c]; if (v[a]) na++; if (v[b]) nb++; });
    Object.keys(data).forEach(function (c) { var v = data[c]; if (v[a] && v[b]) both.push({ c: c, d: pct(v[b].Rank, nb) - pct(v[a].Rank, na), ra: v[a].Rank, rb: v[b].Rank }); });
    both.sort(function (x, y) { return y.d - x.d; });
    function li(x) { return '<li><b><a href="country.html?c=' + encodeURIComponent(x.c) + '">' + esc(x.c) + '</a></b><small>' + G.ord(x.ra) + ' of ' + na + ' (' + a + ') to ' + G.ord(x.rb) + ' of ' + nb + ' (' + b + ')</small><span class="v">' + (x.d > 0 ? '+' : '') + x.d.toFixed(0) + '</span></li>'; }
    $('#mv-h').textContent = 'Biggest movers, ' + a + ' to ' + b;
    $('#mv-note').textContent = 'Change in percentile position (100 is best) among the ' + both.length + ' countries covered in both years. Ranks are out of ' + na + ' in ' + a + ' and ' + nb + ' in ' + b + ', so ranks alone are not comparable.';
    $('#movers').innerHTML = both.slice(0, 5).map(li).join('') + '<li><small>and the biggest falls</small></li>' + both.slice(-5).reverse().map(li).join('');
  }

  ixSel.addEventListener('change', function () { setIndex(G.byId[ixSel.value]); });
  yrSel.addEventListener('change', render);
  q.addEventListener('input', render);
  setIndex(cur, G.param('y') ? Number(G.param('y')) : null);
});
