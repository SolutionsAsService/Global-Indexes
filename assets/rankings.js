/* One index, one year: table, facts, and rank churn (change in position between the first and last year,
   measured among the countries that have a record in BOTH years, so added countries cannot manufacture a move). */
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
      var u = new URL(location.href); u.searchParams.set('i', m.id); if (history.replaceState) history.replaceState(null, '', u);
      render();
    });
  }

  function render() {
    var m = cur, y = yrSel.value, term = q.value.trim().toLowerCase();
    $('#title').textContent = m.name;
    document.title = m.name + ' | Global Indexes';
    var list = Object.keys(data).filter(function (c) { return data[c][y]; }).map(function (c) { return { c: c, s: data[c][y].Score, r: data[c][y].Rank }; });
    var n = list.length;
    list.sort(function (a, b) { return m.verified ? (a.r - b.r || a.c.localeCompare(b.c)) : (b.s - a.s); });
    var tiedCount = {};
    list.forEach(function (x) { tiedCount[x.r] = (tiedCount[x.r] || 0) + 1; });
    var lo = Math.min.apply(null, list.map(function (x) { return x.s; })), hi = Math.max.apply(null, list.map(function (x) { return x.s; }));
    $('#warn').innerHTML = m.verified ? '' : '<p class="warn"><b>Unverified file.</b> ' + esc(m.notes) + ' Ranks are not shown; the table is in score order.</p>';
    $('#th-rank').textContent = m.verified ? 'Rank' : 'Order';
    var shown = list.filter(function (x) { return !term || x.c.toLowerCase().indexOf(term) >= 0; });
    $('#count').textContent = shown.length + ' of ' + n + ' countries with a record in ' + y + '. ' + (m.better === 'lower' ? 'A lower score gives a higher rank.' : 'A higher score gives a higher rank.') + ' Countries with the same score share the best (smallest) rank number and are marked =. A country missing here has no record in this index, which is not a result.';
    rows.innerHTML = shown.map(function (x) {
      var w = hi === lo ? 100 : 100 * Math.abs(x.s - (m.better === 'lower' ? hi : lo)) / (hi - lo);
      var rk = m.verified ? x.r + (tiedCount[x.r] > 1 ? '=' : '') : (list.indexOf(x) + 1);
      return '<tr' + (x.c === sel ? ' class="sel"' : '') + '><td class="n">' + rk + '</td><th scope="row"><a href="country.html?c=' + encodeURIComponent(x.c) + '">' + esc(x.c) + '</a></th><td class="n">' + G.num(x.s) + '</td><td><span class="bar' + (x.c === sel ? ' hot' : '') + '" aria-hidden="true"><i style="width:' + Math.max(2, w).toFixed(1) + '%"></i></span></td></tr>';
    }).join('');
    $('#facts').innerHTML =
      '<div><dt>What it measures</dt><dd>' + esc(m.notes) + '</dd></div>' +
      '<div><dt>Scale</dt><dd>' + esc(m.scale) + '</dd></div>' +
      '<div><dt>Source</dt><dd><a href="' + esc(m.source_url) + '">' + esc(m.source) + '</a></dd></div>' +
      '<div><dt>Coverage</dt><dd>' + m.countries_latest + ' countries in ' + m.last_year + '; ' + m.years.length + ' years from ' + m.first_year + ' to ' + m.last_year + (m.years.length < 10 ? ' (' + m.years.join(', ') + ')' : '') + '</dd></div>';
    churn(m);
  }

  function rankIn(scores, better) { // competition ranks within a set: {country: rank}
    var arr = Object.keys(scores).map(function (c) { return [c, scores[c]]; });
    arr.sort(function (a, b) { return better === 'higher' ? b[1] - a[1] : a[1] - b[1]; });
    var out = {}, rank = 0, prev = null;
    arr.forEach(function (p, i) { if (p[1] !== prev) { rank = i + 1; prev = p[1]; } out[p[0]] = rank; });
    return out;
  }

  function churn(m) {
    var ys = m.years, a = String(ys[0]), b = String(ys[ys.length - 1]);
    var box = $('#movers'), note = $('#mv-note');
    if (!m.verified || a === b || m.harm) {
      box.innerHTML = ''; $('#mv-h').textContent = 'Change over time';
      note.textContent = !m.verified ? 'Not computed for an unverified file.' : m.harm ? 'No list of movers is shown for an index that counts deaths or hunger: ranking who rose or fell on harm would turn it into a league table. Open a country to see its own score over time.' : '';
      return;
    }
    var sa = {}, sb = {}, nA = 0, nB = 0;
    Object.keys(data).forEach(function (c) { var v = data[c]; if (v[a]) nA++; if (v[b]) nB++; if (v[a] && v[b]) { sa[c] = v[a].Score; sb[c] = v[b].Score; } });
    var shared = Object.keys(sa).length;
    var ra = rankIn(sa, m.better), rb = rankIn(sb, m.better);
    var list = Object.keys(sa).map(function (c) { return { c: c, a: ra[c], b: rb[c], d: ra[c] - rb[c] }; }).sort(function (x, y) { return y.d - x.d || x.c.localeCompare(y.c); });
    function li(x) { return '<li><b><a href="country.html?c=' + encodeURIComponent(x.c) + '">' + esc(x.c) + '</a></b><small>' + G.ord(x.a) + ' of ' + shared + ' in ' + a + ', ' + G.ord(x.b) + ' of ' + shared + ' in ' + b + '</small><span class="v">' + (x.d > 0 ? '+' : '') + x.d + '</span></li>'; }
    $('#mv-h').textContent = 'Change in position, ' + a + ' to ' + b;
    note.textContent = 'Positions among only the ' + shared + ' countries with a record in both years (the index covers ' + nA + ' in ' + a + ' and ' + nB + ' in ' + b + '), so added countries cannot cause a move. The number is places gained (+) or lost (−). It shows churn in rank; it does not say why.';
    box.innerHTML = '<li><small>Largest rises</small></li>' + list.slice(0, 5).map(li).join('') + '<li><small>Largest drops</small></li>' + list.slice(-5).reverse().map(li).join('');
  }

  ixSel.addEventListener('change', function () { setIndex(G.byId[ixSel.value]); });
  yrSel.addEventListener('change', render);
  q.addEventListener('input', render);
  setIndex(cur, G.param('y') ? Number(G.param('y')) : null);
});
