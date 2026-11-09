GI.boot('about', function (G) {
  'use strict';
  var esc = G.esc;
  G.$('#src tbody').innerHTML = G.manifest.map(function (m) {
    var span = m.years.length < 8 ? m.years.join(', ') : m.first_year + ' to ' + m.last_year + ' (' + m.years.length + ' years)';
    return '<tr><th scope="row"><a href="rankings.html?i=' + m.id + '">' + esc(m.name) + '</a>' + (m.verified ? '' : '<br><b>unverified</b>') + '</th><td><a href="' + esc(m.source_url) + '">' + esc(m.source) + '</a></td><td>' + span + '</td><td class="n">' + m.countries_latest + ' (' + m.last_year + ')</td><td>' + (m.better === 'lower' ? 'lower is better' : 'higher is better') + '</td></tr>';
  }).join('');
});
