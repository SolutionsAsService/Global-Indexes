/* One country across every index: latest position (rank of n, year, score) and the score history. */
GI.boot('countries', function (G) {
  'use strict';
  var $ = G.$, esc = G.esc, input = $('#c');
  var c = G.param('c') && G.summary[G.param('c')] ? G.param('c') : 'Brazil';
  $('#clist').innerHTML = G.countries.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');

  function spark(series, better) {
    // series: [[year, score]], drawn left to right; the last point is marked. Up is better.
    if (series.length < 2) return '<span class="fine">one year only</span>';
    var xs = series.map(function (s) { return s[0]; }), ys = series.map(function (s) { return s[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var W = 300, H = 34;
    function X(v) { return 4 + (W - 8) * (x1 === x0 ? 0 : (v - x0) / (x1 - x0)); }
    function Y(v) { var t = y1 === y0 ? .5 : (v - y0) / (y1 - y0); if (better === 'lower') t = 1 - t; return H - 4 - (H - 8) * t; }
    var d = series.map(function (s, i) { return (i ? 'L' : 'M') + X(s[0]).toFixed(1) + ',' + Y(s[1]).toFixed(1); }).join('');
    var last = series[series.length - 1];
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Score history ' + x0 + ' to ' + x1 + ', up is better"><path d="' + d + '" vector-effect="non-scaling-stroke"/><path class="end" d="M' + X(last[0]).toFixed(1) + ',' + Y(last[1]).toFixed(1) + 'h0" vector-effect="non-scaling-stroke"/></svg>';
  }

  function render() {
    $('#title').textContent = c; document.title = c + ' | Global Indexes';
    input.value = c;
    var u = new URL(location.href); u.searchParams.set('c', c); history.replaceState && history.replaceState(null, '', u);
    var p = G.summary[c] || {}, have = G.verified.filter(function (m) { return p[m.id]; });
    $('#intro').textContent = 'Covered by ' + have.length + ' of ' + G.verified.length + ' indexes. Each position is the rank within that index in its last published year; the bar runs from worst (empty) to best (full). There is no overall score.';
    var items = G.verified.slice().sort(function (a, b) { return (p[b.id] ? p[b.id].p : -1) - (p[a.id] ? p[a.id].p : -1); });
    var out = items.map(function (m) { return '<li id="r-' + m.id + '"><b>' + esc(m.name) + '<small>loading</small></b></li>'; }).join('');
    $('#list').innerHTML = out;
    items.forEach(function (m) {
      var a = p[m.id], li = $('#r-' + m.id);
      if (!a) { li.innerHTML = '<div><b><a href="rankings.html?i=' + m.id + '">' + esc(m.name) + '</a></b><small>Not covered by this index (' + m.countries_latest + ' countries in ' + m.last_year + ')</small></div><span class="bar"><i style="width:0"></i></span><span class="v">n/a</span>'; return; }
      li.innerHTML = '<div><b><a href="rankings.html?i=' + m.id + '&c=' + encodeURIComponent(c) + '">' + esc(m.name) + '</a></b><small>' + G.ord(a.r) + ' of ' + a.n + ' in ' + a.y + ' · score ' + G.num(a.s) + ' · ' + (m.better === 'lower' ? 'lower is better' : 'higher is better') + '</small></div><span class="bar hot"><i style="width:' + a.p + '%"></i></span><span class="v">' + G.ord(a.r) + '</span>';
      G.file(m).then(function (d) {
        var v = d[c]; if (!v) return;
        var series = Object.keys(v).map(Number).sort(function (x, y) { return x - y; }).map(function (y) { return [y, v[y].Score]; });
        li.insertAdjacentHTML('beforeend', '<div style="grid-column:1/-1"><small class="fine">Score, ' + series[0][0] + ' to ' + series[series.length - 1][0] + ' (' + series.length + ' ' + (series.length === 1 ? 'year' : 'years') + '; up is better; scaled to this country’s own range, ' + G.num(Math.min.apply(null, series.map(function (s) { return s[1]; }))) + ' to ' + G.num(Math.max.apply(null, series.map(function (s) { return s[1]; }))) + ')</small>' + spark(series, m.better) + '</div>');
      });
    });
    $('#foot').innerHTML = 'Positions are not comparable across indexes: each covers a different set of countries in a different year. <a href="compare.html?x=hdi&y=corruption&c=' + encodeURIComponent(c) + '">See two indexes against each other</a>.';
  }
  input.addEventListener('change', function () { if (G.summary[input.value]) { c = input.value; render(); } else input.value = c; });
  render();
});
