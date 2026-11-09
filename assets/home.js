/* Landing: a parallel chart of every country across every verified index.
   Position on an axis = rank within that index in its last published year, highest rank at the top.
   The score at each end of every axis is printed, and the direction (higher or lower score is the higher rank). */
GI.boot('home', function (G) {
  'use strict';
  var $ = G.$, esc = G.esc, axes = G.axes, sum = G.summary;
  var svg = $('#pc'), readout = $('#readout'), c1 = $('#c1'), c2 = $('#c2'), msg = $('#msg');
  var hasParams = !!(G.param('c') || G.param('v'));
  var sel = G.param('c') && sum[G.param('c')] ? G.param('c') : (sum.Brazil ? 'Brazil' : G.countries[0]);
  var cmp = G.param('v') && sum[G.param('v')] ? G.param('v') : (!hasParams && sum.Norway ? 'Norway' : null);
  var hover = null;

  // Score range at each axis end, from the countries drawn (last published year).
  var ends = {};
  axes.forEach(function (m) {
    var v = G.countries.filter(function (c) { return sum[c][m.id]; }).map(function (c) { return sum[c][m.id].s; });
    ends[m.id] = { lo: Math.min.apply(null, v), hi: Math.max.apply(null, v) };
  });

  $('#clist').innerHTML = G.countries.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
  c1.value = sel; c2.value = cmp || '';

  function pos(c) { return sum[c]; }
  function rk(a) { return G.ord(a.r) + (a.t > 1 ? '=' : ''); }

  function draw() {
    var W = Math.max(240, svg.parentNode.clientWidth), narrow = W < 560;
    var top = narrow ? 56 : 104, bottom = 24, H = narrow ? 400 : 450;
    var left = narrow ? 40 : 80, right = narrow ? 22 : 64;
    var step = (W - left - right) / (axes.length - 1), ph = H - top - bottom;
    function x(i) { return left + i * step; }
    function y(p) { return top + ph * (1 - p / 100); }
    var h = '';
    axes.forEach(function (m, i) {
      var cx = x(i), e = ends[m.id], lower = m.better === 'lower';
      var topS = G.num(lower ? e.lo : e.hi), botS = G.num(lower ? e.hi : e.lo);
      h += '<line class="axis" x1="' + cx + '" x2="' + cx + '" y1="' + top + '" y2="' + (top + ph) + '"/>';
      if (narrow) {
        h += '<a href="rankings.html?i=' + m.id + '" aria-label="' + esc(m.name) + '"><rect x="' + (cx - 16) + '" y="' + (top - 46) + '" width="32" height="34" fill="transparent"/><text class="axnum" x="' + cx + '" y="' + (top - 24) + '" text-anchor="middle">' + (i + 1) + '</text></a>';
      } else {
        var words = m.short.split(' '), mid = Math.ceil(words.length / 2);
        var l1 = esc(words.slice(0, mid).join(' ')), l2 = esc(words.slice(mid).join(' '));
        h += '<a href="rankings.html?i=' + m.id + '"><text class="axlab" x="' + cx + '" y="' + (top - 70) + '" text-anchor="middle">' + l1 + '</text>' +
          (l2 ? '<text class="axlab" x="' + cx + '" y="' + (top - 56) + '" text-anchor="middle">' + l2 + '</text>' : '') + '</a>' +
          '<text class="axyr" x="' + cx + '" y="' + (top - 38) + '" text-anchor="middle">' + m.last_year + ' · ' + m.countries_latest + ' countries</text>' +
          '<text class="axyr" x="' + cx + '" y="' + (top - 24) + '" text-anchor="middle">' + (lower ? 'low score on top' : 'high score on top') + '</text>';
      }
      h += '<text class="axend" x="' + cx + '" y="' + (top - 7) + '" text-anchor="middle">' + topS + '</text>' +
        '<text class="axend" x="' + cx + '" y="' + (top + ph + 15) + '" text-anchor="middle">' + botS + '</text>';
    });
    h += '<text class="tick" x="' + (left - 8) + '" y="' + (top + 4) + '" text-anchor="end">' + (narrow ? 'high' : 'highest') + '</text><text class="tick" x="' + (left - 8) + '" y="' + (top + ph + 4) + '" text-anchor="end">' + (narrow ? 'low' : 'lowest') + '</text>';
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
    function strong(c, cls, dcls, mine) {
      if (!c) return '';
      var q = path(c), p = pos(c), s = '<g data-c="' + esc(c) + '"><path class="line ' + cls + '" d="' + q.d + '"/>';
      axes.forEach(function (m, i) {
        var a = p[m.id]; if (!a) return;
        s += '<circle class="' + dcls + '" cx="' + x(i) + '" cy="' + y(a.p) + '" r="5"/>';
        var up = mine ? -7 : 15; if (a.p > 88) up = mine ? 17 : 30; // near the top, stack both labels below the dot so neither meets the score printed above the axis
        if (!narrow) s += '<text class="lab" x="' + (x(i) + 8) + '" y="' + (y(a.p) + up) + '" style="fill:' + (mine ? 'var(--hot)' : 'var(--cool)') + '">' + rk(a) + '</text>';
      });
      return s + '</g>';
    }
    h += strong(cmp, 'on2', 'dot2', false) + strong(sel, 'on', 'dot', true);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('height', H);
    svg.innerHTML = h;
    $('#axkey').innerHTML = narrow ? axes.map(function (m, i) {
      return '<li><a href="rankings.html?i=' + m.id + '"><b>' + (i + 1) + '</b> ' + esc(m.short) + '<small>' + m.last_year + ' · ' + m.countries_latest + ' countries · ' + (m.better === 'lower' ? 'low score on top' : 'high score on top') + '</small></a></li>';
    }).join('') : '';
  }

  function say() {
    var p = pos(sel), have = axes.filter(function (m) { return p[m.id]; }), miss = axes.filter(function (m) { return !p[m.id]; });
    var m1;
    if (!have.length) m1 = '<b>' + esc(sel) + '</b> has no record in any of the indexes.';
    else {
      var plain = have.filter(function (m) { return !m.harm; }); // harm indexes (deaths, hunger) are not named as a best or a worst
      var harm = have.filter(function (m) { return m.harm; });
      var hi = plain.slice().sort(function (a, b) { return p[b.id].p - p[a.id].p; })[0] || have[0];
      var lo = plain.slice().sort(function (a, b) { return p[a.id].p - p[b.id].p; })[0] || have[0];
      var t = function (m) { var a = p[m.id]; return '<b>' + rk(a) + ' of ' + a.n + '</b> on ' + esc(m.short) + ' (' + a.y + ', score ' + G.num(a.s) + (a.t > 1 ? '; tied with ' + (a.t - 1) + ' others' : '') + ')'; };
      m1 = '<b>' + esc(sel) + '</b> has a record in ' + have.length + ' of ' + axes.length + ' indexes.' + (plain.length ? ' Highest position, among the indexes that are not counts of harm: ' + t(hi) + '. Lowest: ' + (lo === hi ? 'the same index' : t(lo)) + '.' : '');
      if (harm.length) m1 += ' Counts of harm, shown as a score first: ' + harm.map(function (m) { var a = p[m.id]; return esc(m.short) + ' (' + a.y + ') score ' + G.num(a.s) + ', ' + rk(a) + ' of ' + a.n + (m.id === 'hunger' && a.s === 2.5 ? ' (2.5 is the “less than 5” category)' : ''); }).join('; ') + '.';
      if (miss.length) m1 += ' No record in ' + miss.map(function (m) { return esc(m.short); }).join(', ') + ' (an absence, not a result).';
    }
    if (cmp) {
      var q = pos(cmp), both = axes.filter(function (m) { return p[m.id] && q[m.id]; });
      var up = both.filter(function (m) { return p[m.id].p > q[m.id].p; }).length, dn = both.filter(function (m) { return p[m.id].p < q[m.id].p; }).length;
      m1 += ' Against <b>' + esc(cmp) + '</b> (dashed): a higher position on ' + up + ' of ' + both.length + ' shared indexes, a lower one on ' + dn + '.';
    }
    readout.innerHTML = m1;
    function line(c) {
      var pc = pos(c);
      return axes.map(function (m) { var a = pc[m.id]; return '<li>' + esc(c) + ', ' + esc(m.name) + ': ' + (a ? rk(a) + ' of ' + a.n + ' in ' + a.y + ', score ' + G.num(a.s) : 'no record') + '</li>'; }).join('');
    }
    $('#sr').innerHTML = line(sel) + (cmp ? line(cmp) : '');
  }

  function tiles() {
    $('#tiles').innerHTML = axes.map(function (m) {
      return '<li><a href="rankings.html?i=' + m.id + '"><b>' + esc(m.short) + '</b><span>' + esc(m.topic) + ' · ' + esc(m.source.split(',')[0]) + '</span><em>' + m.countries_latest + ' countries, ' + m.last_year + '</em></a></li>';
    }).join('');
  }

  function setSel(c, v) {
    if (c !== undefined) sel = c;
    if (v !== undefined) cmp = v;
    var u = new URL(location.href); u.searchParams.set('c', sel); if (cmp) u.searchParams.set('v', cmp); else u.searchParams.set('v', '');
    if (history.replaceState) history.replaceState(null, '', u);
    c1.value = sel; c2.value = cmp || '';
    msg.textContent = ''; c1.removeAttribute('aria-invalid'); c2.removeAttribute('aria-invalid');
    draw(); say();
  }
  function bad(input, keep) {
    msg.textContent = 'No record for “' + input.value + '”. Choose a country from the list.';
    input.setAttribute('aria-invalid', 'true'); input.value = keep || '';
  }
  c1.addEventListener('change', function () { if (sum[c1.value]) setSel(c1.value); else bad(c1, sel); });
  c2.addEventListener('change', function () {
    if (!c2.value) setSel(undefined, null);
    else if (sum[c2.value] && c2.value !== sel) setSel(undefined, c2.value);
    else bad(c2, cmp);
  });
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
