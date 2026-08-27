#!/usr/bin/env node
/**
 * The bilingual SEO gate.
 *
 * Fetches every priority route in both languages from a running server and
 * asserts the things that are invisible on screen and expensive in the index:
 * a self-canonical per language, a reciprocal hreflang pair only where a real
 * equivalent exists, x-default on Arabic, correct lang/dir, and no /en URL
 * quietly canonicalising to the Arabic one.
 *
 * Run against the dev server or a `next start`:  node scripts/i18n-seo.mjs [origin]
 */
const ORIGIN = process.argv[2] ?? process.env.I18N_ORIGIN ?? 'http://localhost:3000'
const SITE = 'https://iraqsm.com'

/** Routes that must carry a reciprocal pair. */
const PAIRED = [
  '/', '/market', '/screener', '/heatmap', '/pulse', '/statistics',
  '/statistics/foreign-flow', '/statistics/ownership', '/statistics/shareholders',
  '/fx', '/gold', '/oil', '/news', '/learn', '/learn/trading-from-zero',
  '/about', '/contact', '/privacy', '/legal', '/c/BBOB', '/c/BBOB/financials',
]

/** Mirrored for usability, never indexed and never paired. */
const PRIVATE = ['/portfolio', '/watchlist', '/profile', '/login', '/signup', '/verify-email', '/forgot-password']

/** Arabic-only: must NOT resolve under /en. */
const AR_ONLY = ['/companies', '/banks', '/charts', '/research', '/analysis', '/alerts']

const fails = []
const fail = (m) => fails.push(m)

const attr = (html, re) => (html.match(re) ?? [])[1] ?? null
const canonicalOf = (h) => attr(h, /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)
const altsOf = (h) => [...h.matchAll(/<link[^>]+rel="alternate"[^>]+hreflang="([^"]+)"[^>]+href="([^"]+)"/gi)]
  .map((m) => [m[1].toLowerCase(), m[2]])
const langOf = (h) => attr(h, /<html[^>]*\blang="([^"]+)"/i)
const dirOf  = (h) => attr(h, /<html[^>]*\bdir="([^"]+)"/i)
const robotsOf = (h) => [...h.matchAll(/<meta[^>]+name="robots"[^>]+content="([^"]+)"/gi)].map((m) => m[1]).join(' ')
const titleOf = (h) => attr(h, /<title>([^<]*)<\/title>/i)

async function get(path) {
  const res = await fetch(ORIGIN + path, { redirect: 'manual' })
  return { status: res.status, location: res.headers.get('location'), html: res.status < 400 ? await res.text() : '' }
}

for (const route of PAIRED) {
  for (const [locale, path, expLang, expDir] of [['ar', route, 'ar', 'rtl'], ['en', route === '/' ? '/en' : `/en${route}`, 'en', 'ltr']]) {
    const { status, html } = await get(path)
    if (status !== 200) { fail(`${path} → HTTP ${status}`); continue }

    if (langOf(html) !== expLang) fail(`${path} lang="${langOf(html)}" (want ${expLang})`)
    if (dirOf(html) !== expDir)   fail(`${path} dir="${dirOf(html)}" (want ${expDir})`)

    const want = locale === 'ar' ? SITE + (route === '/' ? '' : route) : SITE + (route === '/' ? '/en' : `/en${route}`)
    const canon = canonicalOf(html)
    if (canon !== want) fail(`${path} canonical=${canon} (want ${want})`)

    const alts = Object.fromEntries(altsOf(html))
    if (!alts['ar-iq']) fail(`${path} missing hreflang ar-IQ`)
    if (!alts['en'])    fail(`${path} missing hreflang en`)
    if (!alts['x-default']) fail(`${path} missing x-default`)
    if (alts['x-default'] && alts['x-default'] !== alts['ar-iq'])
      fail(`${path} x-default=${alts['x-default']} should equal the Arabic URL`)
    if (alts['en'] && alts['en'].includes('/en/') === false && alts['en'] !== `${SITE}/en`)
      fail(`${path} hreflang en does not point at an /en URL: ${alts['en']}`)
    if (/noindex/i.test(robotsOf(html))) fail(`${path} is noindex but is a paired, indexable route`)
    if (!titleOf(html)) fail(`${path} has no <title>`)
  }
}

for (const route of PRIVATE) {
  for (const path of [route, `/en${route}`]) {
    const { status, html } = await get(path)
    if (status !== 200) { fail(`${path} → HTTP ${status}`); continue }
    if (!/noindex/i.test(robotsOf(html))) fail(`${path} must be noindex`)
    if (altsOf(html).length) fail(`${path} must emit NO hreflang (it is a usability mirror, not a search surface)`)
  }
}

for (const route of AR_ONLY) {
  const { status } = await get(`/en${route}`)
  if (status === 200) fail(`/en${route} resolves — Arabic-only routes must not exist under /en`)
}

/* An English article URL must not exist: the CMS has no English bodies. */
{
  const { status } = await get('/en/news/anything')
  if (status === 200) fail('/en/news/[slug] resolves — no English article URLs may be minted')
}

/* The withdrawn /en redirects must be gone. */
for (const path of ['/en', '/en/market']) {
  const { status, location } = await get(path)
  if (status >= 300 && status < 400) fail(`${path} still redirects (${status} → ${location}) — the legacy /en 301s must stay removed`)
}

/* A 404 must be a real 404, and must not inherit the root canonical. */
for (const path of ['/does-not-exist', '/en/does-not-exist']) {
  const { status, html } = await get(path)
  if (status !== 404) fail(`${path} → HTTP ${status}, expected 404`)
  if (html && canonicalOf(html)) fail(`${path} emits a canonical (${canonicalOf(html)}) — a 404 must not`)
}

if (fails.length) {
  console.error(`✗ bilingual SEO: ${fails.length} problem(s)`)
  for (const f of fails) console.error('  ·', f)
  process.exit(1)
}
console.log(`✓ bilingual SEO: ${PAIRED.length} paired routes, ${PRIVATE.length} private mirrors, ${AR_ONLY.length} Arabic-only routes, redirects clear, 404s clean`)
