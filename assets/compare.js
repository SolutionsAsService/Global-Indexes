/* Two indexes against each other. Uses summary.json: each index's last published year, positions as percentiles (100 = highest rank). */
GI.boot('compare', function (G) {
  'use strict';
  var $ = G.$, esc = G.esc, xs = $('#x'), ys = $('#y'), ci = $('#c'), msg = $('#msg');
  var opts = G.verified.map(function (m) { return '<option value="' + m.id + '">' + esc(m.name) + '</option>'; }).join('');
  xs.innerHTML = opts; ys.innerHTML = opts;
  xs.value = G.byId[G.param('x')] && G.byId[G.param('x')].verified ? G.param('x') : 'hdi';
  ys.value = G.byId[G.param('y')] && G.byId[G.param('y')].verified ? G.param('y') : 'corruption';
  var hl = G.summary[G.param('c')] ? G.param('c') : '';
  $('#clist').innerHTML = G.countries.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
  ci.value = hl;

  function ranks(v) {
    var idx = v.map(function (a, i) { return [a, i]; }).sort(function (a, b) { return a[0] - b[0]; }), r = new Array(v.length), i = 0;
    while (i < idx.length) { var j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; var avg = (i + j) / 2 + 1; for (var k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; }
    return r;
  }
  function pearson(a, b) {
    var n = a.length, ma = a.reduce(function (s, v) { return s + v; }, 0) / n, mb = b.reduce(function (s, v) { return s + v; }, 0) / n, sab = 0, saa = 0, sbb = 0;
    for (var i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += Math.pow(a[i] - ma, 2); sbb += Math.pow(b[i] - mb, 2); }
    return sab / Math.sqrt(saa * sbb);
  }

  function render() {
    var X = G.byId[xs.value], Y = G.byId[ys.value];
    var u = new URL(location.href); u.searchParams.set('x', X.id); u.searchParams.set('y', Y.id); if (hl) u.searchParams.set('c', hl); else u.searchParams.delete('c');
    if (history.replaceState) history.replaceState(null, '', u);
    var pts = G.countries.filter(function (c) { var p = G.summary[c]; return p[X.id] && p[Y.id]; }).map(function (c) { var p = G.summary[c]; return { c: c, x: p[X.id].p, y: p[Y.id].p, a: p[X.id], b: p[Y.id] }; });
    var W = Math.max(240, $('#sc').parentNode.clientWidth - 28), H = Math.round(Math.min(560, W * 0.85)), m = { l: 44, r: 14, t: 12, b: 40 };
    function px(v) { return m.l + (W - m.l - m.r) * v / 100; }
    function py(v) { return m.t + (H - m.t - m.b) * (1 - v / 100); }
    var h = '';
    [0, 25, 50, 75, 100].forEach(function (t) {
      h += '<line class="grid" x1="' + px(0) + '" x2="' + px(100) + '" y1="' + py(t) + '" y2="' + py(t) + '"/><line class="grid" x1="' + px(t) + '" x2="' + px(t) + '" y1="' + py(0) + '" y2="' + py(100) + '"/>' +
        '<text class="tick" x="' + (m.l - 6) + '" y="' + (py(t) + 3) + '" text-anchor="end">' + t + '</text><text class="tick" x="' + px(t) + '" y="' + (py(0) + 14) + '" text-anchor="middle">' + t + '</text>';
    });
    h += '<line x1="' + px(0) + '" y1="' + py(0) + '" x2="' + px(100) + '" y2="' + py(100) + '" stroke="var(--rule)" stroke-dasharray="4 4"/>';
    pts.forEach(function (p) { h += '<circle class="pt' + (p.c === hl ? ' sel' : '') + '" data-c="' + esc(p.c) + '" cx="' + px(p.x) + '" cy="' + py(p.y) + '" r="' + (p.c === hl ? 6 : 3.4) + '"><title>' + esc(p.c) + '</title></circle>'; });
    var far = pts.slice().sort(function (a, b) { return Math.abs(b.x - b.y) - Math.abs(a.x - a.y); });
    var named = far.slice(0, 6).map(function (p) { return p.c; });
    if (hl && named.indexOf(hl) < 0) named.unshift(hl);
    var boxes = [];
    named.forEach(function (c) { // label each named point once, skipping any that would overlap one already placed
      var p = pts.filter(function (z) { return z.c === c; })[0]; if (!p) return;
      var w = c.length * 6.4 + 4, bx = px(p.x) + 8, by = py(p.y) - 16;
      if (bx + w > W - 4) bx = px(p.x) - 8 - w;
      var hit = boxes.some(function (b) { return bx < b[0] + b[2] && bx + w > b[0] && by < b[1] + 14 && by + 14 > b[1]; });
      if (hit && c !== hl) return;
      boxes.push([bx, by, w]);
      h += '<text class="lab" style="fill:' + (c === hl ? 'var(--hot)' : 'var(--ink)') + '" x="' + bx + '" y="' + (by + 11) + '">' + esc(c) + '</text>';
    });
    h += '<text class="axlab" x="' + ((m.l + W - m.r) / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + esc(X.short) + ' (' + X.last_year + '): higher rank →</text>' +
      '<text class="axlab" transform="translate(12,' + ((m.t + H - m.b) / 2) + ') rotate(-90)" text-anchor="middle">' + esc(Y.short) + ' (' + Y.last_year + '): higher rank →</text>';
    var svg = $('#sc'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('height', H); svg.innerHTML = h;
    var rho = pts.length > 2 ? pearson(ranks(pts.map(function (p) { return p.x; })), ranks(pts.map(function (p) { return p.y; }))) : NaN;
    var word = isNaN(rho) ? '' : Math.abs(rho) >= .8 ? 'closely alike' : Math.abs(rho) >= .6 ? 'fairly alike' : Math.abs(rho) >= .3 ? 'loosely alike' : 'barely related';
    $('#stat').innerHTML = X.id === Y.id ? 'Pick two different indexes.' : '<b>' + (isNaN(rho) ? 'not enough countries' : rho.toFixed(2) + ' on a scale from −1 to 1') + '</b> across ' + pts.length + ' countries with a record in both' + (word ? ': the two orderings are ' + word + (rho < 0 ? ', and run in opposite directions' : '') + '.' : '.') + ' 1 would mean the same order exactly, 0 no pattern, and −1 the reverse order.';
    $('#axes').textContent = X.name + ': ' + X.countries_latest + ' countries in ' + X.last_year + '. ' + Y.name + ': ' + Y.countries_latest + ' countries in ' + Y.last_year + '. Shared: ' + pts.length + '. The dashed line marks equal positions (equal rank, not equal score).';
    $('#far').innerHTML = far.slice(0, 6).map(function (p) {
      return '<li><b><a href="country.html?c=' + encodeURIComponent(p.c) + '">' + esc(p.c) + '</a></b><small>' + G.ord(p.a.r) + ' of ' + p.a.n + ' on ' + esc(X.short) + ', ' + G.ord(p.b.r) + ' of ' + p.b.n + ' on ' + esc(Y.short) + '</small><span class="v" title="percentile points apart">' + Math.abs(p.x - p.y).toFixed(0) + ' pts</span></li>';
    }).join('');
  }
  xs.addEventListener('change', render); ys.addEventListener('change', render);
  ci.addEventListener('change', function () {
    if (!ci.value) { hl = ''; msg.textContent = ''; ci.removeAttribute('aria-invalid'); }
    else if (G.summary[ci.value]) { hl = ci.value; msg.textContent = ''; ci.removeAttribute('aria-invalid'); }
    else { msg.textContent = 'No record for “' + ci.value + '”. Choose a country from the list.'; ci.setAttribute('aria-invalid', 'true'); ci.value = hl; }
    render();
  });
  $('#sc').addEventListener('click', function (e) { var c = e.target.getAttribute && e.target.getAttribute('data-c'); if (c) { hl = c; ci.value = c; render(); } });
  render();
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(render, 120); });
});
