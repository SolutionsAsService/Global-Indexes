// The site gate: node scripts/check-site.mjs
//  1. every internal link, script and stylesheet in every page resolves to a file
//  2. every index file parses; every record is {Score, Rank}; verified indexes have ranks in score order
//  3. manifest.json agrees with the files (years, country counts); summary.json agrees with them (rank, n, percentile)
//  4. every data-fig key a page uses is computed by assets/gi.js
//  5. a claim lint refuses phrases the reviews turned up; external requests are refused
//  6. a fixture with ranks that contradict scores must fail check 2 (so the check cannot pass vacuously)
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const problems = []
const bad = (m) => problems.push(m)
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')

// ---- 2: rank order (also used by the fixture)
function rankOrderProblems(name, data, years, better) {
  const out = []
  for (const y of years) {
    const sign = better === 'higher' ? -1 : 1
    const pts = []
    for (const c of Object.keys(data)) { const r = data[c][String(y)]; if (r) pts.push([sign * r.Score, r.Rank]) }
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1])
    let last = 0
    for (const [, rank] of pts) { if (rank < last) { out.push(`${name} ${y}: rank ${rank} out of score order`); break } last = rank }
  }
  return out
}
{
  const fixture = { A: { 2020: { Score: 90, Rank: 2 } }, B: { 2020: { Score: 80, Rank: 1 } } }
  if (rankOrderProblems('fixture', fixture, [2020], 'higher').length === 0) bad('gate: the failing fixture was accepted, so the rank check is vacuous')
}

// ---- 1: links and banned phrases
const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html'))
const figKeys = new Set()
const giSrc = read('assets/gi.js')
const knownFigs = new Set([...giSrc.matchAll(/\b(indexes|countries|minyear|maxyear|minc|maxc)\s*:/g)].map((m) => m[1]))
for (const p of pages) {
  const html = read(p)
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const u = m[1]
    if (/^(https?:|mailto:|#|data:)/.test(u)) continue
    const f = u.split('#')[0].split('?')[0]
    if (f && !fs.existsSync(path.join(root, f))) bad(`${p}: dead link ${u}`)
  }
  if (/fonts\.googleapis|cdn\.|unpkg|jsdelivr/.test(html)) bad(`${p}: external request`)
  const text = html.replace(/<script[\s\S]*?<\/script>|<[^>]+>/g, ' ').toLowerCase()
  for (const w of ['global economy', 'unparalleled', 'next-generation', 'state-of-the-art', 'world-class', 'all rights reserved']) if (text.includes(w)) bad(`${p}: banned phrase "${w}"`)
  if (text.includes('non-economic') && p !== 'about.html') bad(`${p}: "non-economic" is not true of every index; only about.html may discuss it`)
  for (const m of html.matchAll(/data-fig="([^"]+)"/g)) figKeys.add(m[1])
}
for (const k of figKeys) if (!knownFigs.has(k)) bad(`data-fig="${k}" is not computed by assets/gi.js`)
for (const f of fs.readdirSync(path.join(root, 'assets')).filter((x) => x.endsWith('.css'))) {
  if (/@import url\(['"]?https?:/.test(read('assets/' + f))) bad(`assets/${f}: external @import`)
}

// ---- 2 and 3: data
const manifest = JSON.parse(read('manifest.json'))
const summary = JSON.parse(read('summary.json'))
const files = {}
for (const m of manifest.indexes) {
  let d
  try { d = JSON.parse(read(m.file)) } catch (e) { bad(`${m.file}: ${e.message}`); continue }
  files[m.id] = d
  const years = new Set()
  for (const c of Object.keys(d)) for (const y of Object.keys(d[c])) {
    const r = d[c][y]
    if (!r || typeof r.Score !== 'number' || !Number.isInteger(r.Rank)) bad(`${m.file} ${c} ${y}: bad record`)
    years.add(Number(y))
  }
  const ys = [...years].sort((a, b) => a - b)
  if (JSON.stringify(ys) !== JSON.stringify(m.years)) bad(`${m.file}: manifest years differ from the file`)
  const last = String(ys[ys.length - 1])
  const nLast = Object.keys(d).filter((c) => d[c][last]).length
  if (nLast !== m.countries_latest) bad(`${m.file}: manifest says ${m.countries_latest} countries in ${last}, file has ${nLast}`)
  if (m.verified) for (const p of rankOrderProblems(m.file, d, ys, m.better)) bad(p)
}
const nameSeen = new Map()
for (const m of manifest.indexes.filter((x) => x.verified)) {
  const d = files[m.id]; if (!d) continue
  const last = String(m.last_year)
  for (const c of Object.keys(summary)) {
    const s = summary[c][m.id]
    const r = d[c] && d[c][last]
    if (!!s !== !!r) { bad(`summary ${c} ${m.id}: presence differs from the file`); continue }
    if (!s) continue
    const want = Math.round(1000 * (m.countries_latest - r.Rank) / (m.countries_latest - 1)) / 10
    if (s.r !== r.Rank || s.s !== r.Score || s.n !== m.countries_latest || Math.abs(s.p - want) > 0.051) bad(`summary ${c} ${m.id}: differs from the file`)
  }
  for (const c of Object.keys(d)) nameSeen.set(c, (nameSeen.get(c) || 0) + 1)
}
// one spelling per country: no two names that normalise alike
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '')
const byNorm = {}
for (const c of nameSeen.keys()) (byNorm[norm(c)] ||= []).push(c)
for (const v of Object.values(byNorm)) if (v.length > 1) bad(`country spelled two ways: ${v.join(' / ')}`)
for (const n of ['Czech Republic', 'Swaziland', 'Macedonia', 'Ivory Coast', 'Korea', 'Guam', 'World']) if (nameSeen.has(n)) bad(`"${n}" should have been renamed or dropped`)

if (problems.length) { console.error(problems.join('\n')); process.exit(1) }
console.log(`OK: ${pages.length} pages, ${manifest.indexes.length} indexes, ${Object.keys(summary).length} countries in summary; links, figures, ranks and names agree`)
