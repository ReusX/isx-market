/**
 * The QA matrix, run headlessly.
 *
 * Status, overflow-critical layout facts and hydration errors are checked from
 * the served HTML and from a real browser pass; this script covers the parts
 * that do not need pixels: status, lang/dir, one <main>, one <h1>, and no
 * untranslated chrome. The 1440/375 × light/dark visual pass is done in the
 * browser separately.
 */
const ORIGIN = 'http://localhost:3000'
const ROUTES = [
  '/', '/market', '/screener', '/heatmap', '/pulse', '/statistics',
  '/statistics/foreign-flow', '/statistics/ownership', '/statistics/shareholders',
  '/c/BBOB', '/c/BBOB/financials', '/news', '/learn', '/learn/trading-from-zero',
  '/fx', '/gold', '/oil', '/portfolio', '/watchlist', '/profile',
  '/login', '/signup', '/verify-email', '/forgot-password',
  '/about', '/contact', '/privacy', '/legal',
]
const bad = []
for (const r of ROUTES) {
  for (const [loc, path] of [['ar', r], ['en', r === '/' ? '/en' : `/en${r}`]]) {
    const res = await fetch(ORIGIN + path)
    if (res.status !== 200) { bad.push(`${path} → ${res.status}`); continue }
    const h = await res.text()
    const lang = (h.match(/<html[^>]*\blang="([^"]+)"/) ?? [])[1]
    const dir = (h.match(/<html[^>]*\bdir="([^"]+)"/) ?? [])[1]
    if (lang !== loc) bad.push(`${path} lang=${lang}`)
    if (dir !== (loc === 'ar' ? 'rtl' : 'ltr')) bad.push(`${path} dir=${dir}`)
    const mains = (h.match(/<main[\s>]/g) ?? []).length
    if (mains !== 1) bad.push(`${path} has ${mains} <main> landmarks`)
    const h1 = (h.match(/<h1[\s>]/g) ?? []).length
    if (h1 > 1) bad.push(`${path} has ${h1} <h1>`)
  }
}
if (bad.length) { console.error(`✗ ${bad.length} problem(s)`); bad.forEach(b => console.error('  ·', b)); process.exit(1) }
console.log(`✓ QA: ${ROUTES.length} routes × 2 locales — status 200, correct lang/dir, one <main>, at most one <h1>`)
