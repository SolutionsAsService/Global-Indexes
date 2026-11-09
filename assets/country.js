/* One country across every index: latest position (rank of n, year, score) and the score history,
   each history drawn on the index's own full score range so a small wobble looks small. */
GI.boot('countries', function (G) {
  'use strict';
  var $ = G.$, esc = G.esc, input = $('#c'), msg = $('#msg');
  var c = G.param('c') && G.summary[G.param('c')] ? G.param('c') : 'Brazil';
  $('#clist').innerHTML = G.countries.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
  function rk(a) { return G.ord(a.r) + (a.t > 1 ? '=' : ''); }

  function spark(series, m) {
    if (series.length < 2) return '<span class="fine">one year only</span>';
    var xs = series.map(function (s) { return s[0]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = m.min_score, y1 = m.max_score;
    var W = 300, H = 34;
    function X(v) { return 4 + (W - 8) * (x1 === x0 ? 0 : (v - x0) / (x1 - x0)); }
    function Y(v) { var t = y1 === y0 ? .5 : (v - y0) / (y1 - y0); return H - 4 - (H - 8) * t; }
    var d = series.map(function (s, i) { return (i ? 'L' : 'M') + X(s[0]).toFixed(1) + ',' + Y(s[1]).toFixed(1); }).join('');
    var last = series[series.length - 1];
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Score history, ' + x0 + ' to ' + x1 + ', on the index’s full score range"><path d="' + d + '" vector-effect="non-scaling-stroke"/><path class="end" d="M' + X(last[0]).toFixed(1) + ',' + Y(last[1]).toFixed(1) + 'h0" vector-effect="non-scaling-stroke"/></svg>';
  }

  function render() {
    $('#title').textContent = c; document.title = c + ' | Global Indexes';
    input.value = c;
    var u = new URL(location.href); u.searchParams.set('c', c); if (history.replaceState) history.replaceState(null, '', u);
    var p = G.summary[c] || {}, have = G.verified.filter(function (m) { return p[m.id]; });
    $('#intro').textContent = 'A record in ' + have.length + ' of ' + G.verified.length + ' indexes. Each position is the rank within that index in its last published year; the bar runs from the lowest rank (empty) to the highest (full). There is no overall score.';
    var items = G.verified.slice().sort(function (a, b) { return (p[b.id] ? p[b.id].p : -1) - (p[a.id] ? p[a.id].p : -1); });
    $('#list').innerHTML = items.map(function (m) { return '<li id="r-' + m.id + '"></li>'; }).join('');
    items.forEach(function (m) {
      var a = p[m.id], li = $('#r-' + m.id);
      if (!a) { li.innerHTML = '<div><b><a href="rankings.html?i=' + m.id + '">' + esc(m.name) + '</a></b><small>No record in this index (it covers ' + m.countries_latest + ' countries in ' + m.last_year + '). That is an absence, not a result.</small></div><span></span><span class="v">no record</span>'; return; }
      li.innerHTML = '<div><b><a href="rankings.html?i=' + m.id + '&c=' + encodeURIComponent(c) + '">' + esc(m.name) + '</a></b><small>' + (m.harm ? 'score ' + G.num(a.s) + ' in ' + a.y + ' · ' + rk(a) + ' of ' + a.n : rk(a) + ' of ' + a.n + ' in ' + a.y + ' · score ' + G.num(a.s)) + ' · ' + (m.better === 'lower' ? 'a lower score gives a higher rank' : 'a higher score gives a higher rank') + (a.t > 1 ? ' · tied with ' + (a.t - 1) + ' others' : '') + '</small></div><span class="bar hot" aria-hidden="true"><i style="width:' + a.p + '%"></i></span><span class="v">' + rk(a) + '</span>';
      G.file(m).then(function (d) {
        var v = d[c]; if (!v) return;
        var series = Object.keys(v).map(Number).sort(function (x, y) { return x - y; }).map(function (y) { return [y, v[y].Score]; });
        li.insertAdjacentHTML('beforeend', '<div style="grid-column:1/-1"><small class="fine">Score, ' + series[0][0] + ' to ' + series[series.length - 1][0] + ' (' + series.length + ' ' + (series.length === 1 ? 'year' : 'years') + '), on the index’s full range of ' + G.num(m.min_score) + ' to ' + G.num(m.max_score) + '</small>' + spark(series, m) + '</div>');
      });
    });
    $('#foot').innerHTML = 'Positions are not comparable across indexes: each covers a different set of countries in a different year. <a href="compare.html?x=hdi&y=corruption&c=' + encodeURIComponent(c) + '">See two indexes against each other</a>.';
  }
  input.addEventListener('change', function () {
    if (G.summary[input.value]) { c = input.value; msg.textContent = ''; input.removeAttribute('aria-invalid'); render(); }
    else { msg.textContent = 'No record for “' + input.value + '”. Choose a country from the list.'; input.setAttribute('aria-invalid', 'true'); input.value = c; }
  });
  render();
});
