/* Landing: a parallel chart of every country across every verified index.
   Position on an axis = rank within that index in its last published year, worst (bottom) to best (top). */
GI.boot('home', function (G) {
  'use strict';
  var $ = G.$, esc = G.esc, axes = G.axes, sum = G.summary;
  var svg = $('#pc'), readout = $('#readout'), c1 = $('#c1'), c2 = $('#c2');
  var sel = G.param('c') && sum[G.param('c')] ? G.param('c') : (sum.Brazil ? 'Brazil' : G.countries[0]);
  var cmp = G.param('v') && sum[G.param('v')] ? G.param('v') : null;
  var hover = null;

  $('#clist').innerHTML = G.countries.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
  c1.value = sel; c2.value = cmp || '';

  function pos(c) { return sum[c]; }

  function draw() {
    var W = Math.max(240, svg.parentNode.clientWidth), narrow = W < 560;
    var top = narrow ? 138 : 84, bottom = 22, H = narrow ? 440 : 430;
    var left = narrow ? 44 : 64, right = narrow ? 24 : 64;
    var step = (W - left - right) / (axes.length - 1), ph = H - top - bottom;
    function x(i) { return left + i * step; }
    function y(p) { return top + ph * (1 - p / 100); }
    var h = '';
    // axes and labels
    axes.forEach(function (m, i) {
      var cx = x(i);
      h += '<line class="axis" x1="' + cx + '" x2="' + cx + '" y1="' + top + '" y2="' + (top + ph) + '"/>';
      var words = m.short.split(' '), mid = Math.ceil(words.length / 2);
      var l1 = esc(words.slice(0, mid).join(' ')), l2 = esc(words.slice(mid).join(' '));
      if (narrow) {
        h += '<a href="rankings.html?i=' + m.id + '"><text class="axlab" transform="translate(' + (cx + 4) + ',' + (top - 8) + ') rotate(-65)">' + esc(m.short) + '</text></a>' +
          '<text class="axyr" x="' + cx + '" y="' + (top + ph + 14) + '" text-anchor="middle">' + m.last_year + '</text>';
      } else {
        h += '<a href="rankings.html?i=' + m.id + '"><text class="axlab" x="' + cx + '" y="' + (top - 50) + '" text-anchor="middle">' + l1 + '</text>' +
          (l2 ? '<text class="axlab" x="' + cx + '" y="' + (top - 36) + '" text-anchor="middle">' + l2 + '</text>' : '') + '</a>' +
          '<text class="axyr" x="' + cx + '" y="' + (top - 20) + '" text-anchor="middle">' + m.last_year + ' · ' + m.countries_latest + '</text>';
      }
    });
    h += '<text class="tick" x="' + (left - 8) + '" y="' + (top + 4) + '" text-anchor="end">best</text><text class="tick" x="' + (left - 8) + '" y="' + (top + ph + 4) + '" text-anchor="end">worst</text>';
    // every country, faint
    var order = G.countries.filter(function (c) { return c !== sel && c !== cmp; });
    function path(c) {
      var p = pos(c), d = '', dots = '';
      axes.forEach(function (m, i) {
        var a = p[m.id]; if (!a) return;
        var b = axes[i + 1] && p[axes[i + 1].id];
        if (b) d += 'M' + x(i) + ',' + y(a.p) + 'L' + x(i + 1) + ',' + y(b.p);
        else if (!(i > 0 && p[axes[i - 1].id])) dots += '<circle cx="' + x(i) + '" cy="' + y(a.p) + '" r="1.8" fill="var(--faint)"/>';
      });
      return { d: d, dots: dots };
    }
    order.forEach(function (c) {
      var q = path(c);
      h += '<g data-c="' + esc(c) + '"><path class="line' + (hover === c ? ' hov' : '') + '" d="' + q.d + '"/>' + q.dots + '<path class="hit" d="' + q.d + '"/></g>';
    });
    function strong(c, cls, dcls, lbl) {
      if (!c) return '';
      var q = path(c), p = pos(c), s = '<g data-c="' + esc(c) + '"><path class="line ' + cls + '" d="' + q.d + '"/>';
      axes.forEach(function (m, i) {
        var a = p[m.id]; if (!a) return;
        s += '<circle class="' + dcls + '" cx="' + x(i) + '" cy="' + y(a.p) + '" r="5"/>';
        if (!narrow) s += '<text class="lab" x="' + (x(i) + 8) + '" y="' + (y(a.p) + (lbl ? -7 : 14)) + '" style="fill:' + (lbl ? 'var(--hot)' : 'var(--cool)') + '">' + G.ord(a.r) + '</text>';
      });
      return s + '</g>';
    }
    h += strong(cmp, 'on2', 'dot2', false) + strong(sel, 'on', 'dot', true);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('height', H);
    svg.innerHTML = h;
  }

  function say() {
    var p = pos(sel), have = axes.filter(function (m) { return p[m.id]; }), miss = axes.filter(function (m) { return !p[m.id]; });
    var msg;
    if (!have.length) msg = '<b>' + esc(sel) + '</b> is not covered by any of the indexes.';
    else {
      var best = have.slice().sort(function (a, b) { return p[b.id].p - p[a.id].p; })[0];
      var worst = have.slice().sort(function (a, b) { return p[a.id].p - p[b.id].p; })[0];
      function t(m) { var a = p[m.id]; return '<b>' + G.ord(a.r) + ' of ' + a.n + '</b> on ' + esc(m.short) + ' (' + a.y + ', score ' + G.num(a.s) + ')'; }
      msg = '<b>' + esc(sel) + '</b>, ' + have.length + ' of ' + axes.length + ' indexes. Best placed: ' + t(best) + '. Furthest behind: ' + (worst === best ? 'the same index' : t(worst)) + '.';
      if (miss.length) msg += ' Not covered by ' + miss.map(function (m) { return esc(m.short); }).join(', ') + '.';
    }
    if (cmp) {
      var q = pos(cmp), both = axes.filter(function (m) { return p[m.id] && q[m.id]; });
      var ahead = both.filter(function (m) { return p[m.id].p > q[m.id].p; }).length, behind = both.filter(function (m) { return p[m.id].p < q[m.id].p; }).length;
      msg += ' Against <b>' + esc(cmp) + '</b> (dashed): ahead on ' + ahead + ' of ' + both.length + ' shared indexes, behind on ' + behind + '.';
    }
    readout.innerHTML = msg;
    $('#sr').innerHTML = axes.map(function (m) {
      var a = p[m.id];
      return '<li>' + esc(m.name) + ': ' + (a ? G.ord(a.r) + ' of ' + a.n + ' in ' + a.y + ', score ' + G.num(a.s) : 'not covered') + '</li>';
    }).join('');
  }

  function tiles() {
    $('#tiles').innerHTML = axes.map(function (m) {
      return '<li><a href="rankings.html?i=' + m.id + '"><b>' + esc(m.short) + '</b><span>' + esc(m.topic) + ' · ' + esc(m.source.split(',')[0]) + '</span><em>' + m.countries_latest + ' countries, ' + m.last_year + '</em></a></li>';
    }).join('');
  }

  function setSel(c, v) {
    if (c !== undefined) sel = c; if (v !== undefined) cmp = v;
    var u = new URL(location.href); u.searchParams.set('c', sel); if (cmp) u.searchParams.set('v', cmp); else u.searchParams.delete('v');
    if (history.replaceState) history.replaceState(null, '', u);
    c1.value = sel; c2.value = cmp || '';
    draw(); say();
  }
  c1.addEventListener('change', function () { if (sum[c1.value]) setSel(c1.value); else c1.value = sel; });
  c2.addEventListener('change', function () { if (!c2.value) setSel(undefined, null); else if (sum[c2.value] && c2.value !== sel) setSel(undefined, c2.value); else c2.value = cmp || ''; });
  $('#rand').addEventListener('click', function () { setSel(G.countries[Math.floor(Math.random() * G.countries.length)]); });
  svg.addEventListener('click', function (e) {
    var g = e.target.closest('g[data-c]'); if (!g) return;
    var c = g.getAttribute('data-c');
    if (e.shiftKey || e.metaKey) setSel(undefined, c === cmp ? null : c); else setSel(c);
  });
  var tip = $('#tip');
  svg.addEventListener('pointermove', function (e) {
    var g = e.target.closest('g[data-c]'), c = g ? g.getAttribute('data-c') : null;
    if (c !== hover) {
      clearHover();
      hover = c;
      if (c) { var l = svg.querySelector('g[data-c="' + CSS.escape(c) + '"] .line'); if (l && !l.classList.contains('on') && !l.classList.contains('on2')) l.classList.add('hov'); }
    }
    if (c) {
      var r = svg.parentNode.getBoundingClientRect();
      tip.hidden = false; tip.textContent = c + ' (click to follow, shift-click to compare)';
      tip.style.left = Math.min(r.width - 230, Math.max(0, e.clientX - r.left + 12)) + 'px'; tip.style.top = (e.clientY - r.top - 34) + 'px';
    } else tip.hidden = true;
  });
  svg.addEventListener('pointerleave', function () { hover = null; tip.hidden = true; clearHover(); });
  function clearHover() { svg.querySelectorAll('.line.hov').forEach(function (l) { l.classList.remove('hov'); }); }

  tiles(); draw(); say();
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(draw, 100); });
});
