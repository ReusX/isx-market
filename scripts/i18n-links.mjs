/**
 * Cross-locale link integrity.
 *
 * Ahrefs found 104 broken links on 28 August 2026: every /en/c/[sym] page
 * pointed at /en/companies, which 404d. `localePath()` prefixes the locale
 * unconditionally — it mints a URL without asking the registry whether that
 * URL exists — so one `L(...)` in a SHARED route surface naming a route that
 * has no English twin becomes a broken link on every page that renders it.
 *
 * That particular URL was answered by BUILDING /en/companies rather than by
 * removing the link, because the Arabic directory is a real ranking page and
 * the only crawlable path to /c/[sym]. The gate remains, because the class
 * does: any future `L('/banks')` would break the same way.
 *
 * A second instance sat in IndexChart (`L('/charts')`) and no crawler had ever
 * seen it, because that component only renders inside a panel the reader has
 * to open first. That is why this gate has two halves:
 *
 *   STATIC   every `L(...)` / `href(...)` literal in a shared surface must
 *            name a route that exists in BOTH languages. Catches links behind
 *            an interaction, which a crawl cannot reach.
 *   RENDERED every internal link in the delivered HTML of a sample of routes
 *            must resolve. Catches whatever the static pass cannot see.
 *
 *   node scripts/i18n-links.mjs [origin]
 */
import fs from 'node:fs'
import { readRegistry } from './lib/registry.mjs'
import path from 'node:path'

const ORIGIN = process.argv[2] ?? process.env.I18N_ORIGIN ?? 'http://localhost:3000'
const bad = []

// ── Which routes exist in English? Read the registry, do not restate it ────
const arOnly = new Set(readRegistry().arOnly)

// ── STATIC · shared surfaces must not link to an Arabic-only route ─────────
function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(f))
    else if (/\.tsx?$/.test(e.name)) out.push(f)
  }
  return out
}

/* Only SHARED surfaces. Files under app/(ar) render in one language and may
   legitimately link anywhere in the Arabic tree. */
const shared = [...walk('components')]
for (const file of shared) {
  const src = fs.readFileSync(file, 'utf8')
  for (const m of src.matchAll(/\b(?:L|href)\(\s*'(\/[^']*)'/g)) {
    const route = m[1]
    if (!arOnly.has(route)) continue
    const line = src.slice(0, m.index).split('\n').length
    bad.push(`${file}:${line} links to ${route}, which is ar-only — on /en this resolves to /en${route} and 404s`)
  }
}

// ── RENDERED · every internal link in the delivered HTML must resolve ──────
const SAMPLE = [
  '/', '/market', '/statistics', '/statistics/ownership', '/c/TASC', '/c/BBOB/financials', '/news', '/legal',
  '/en', '/en/market', '/en/statistics', '/en/statistics/ownership', '/en/c/TASC', '/en/c/BBOB/financials', '/en/news', '/en/legal',
]
const status = new Map()
const seenShape = new Set()
async function check(href) {
  if (status.has(href)) return status.get(href)
  const res = await fetch(ORIGIN + href, { redirect: 'manual' }).catch(() => null)
  const code = res ? res.status : 0
  status.set(href, code)
  return code
}

for (const page of SAMPLE) {
  /* Guarded: an unreachable origin must be REPORTED, not thrown. An
     unhandled rejection here kills the process before the static findings
     above are ever printed — a gate that dies silently is a gate that
     passes silently. */
  const res = await fetch(ORIGIN + page).catch(() => null)
  if (!res) { bad.push(`${page} → origin unreachable at ${ORIGIN}`); continue }
  if (res.status !== 200) { bad.push(`${page} → ${res.status}`); continue }
  const html = await res.text()
  const hrefs = new Set(
    [...html.matchAll(/href="(\/[^"#?]*)"/g)]
      .map(m => m[1])
      .filter(h => !h.startsWith('/_next') && !h.startsWith('/data/') && !/\.(png|jpe?g|svg|ico|xml|txt|webmanifest)$/.test(h)),
  )
  for (const h of hrefs) {
    /* One representative per URL SHAPE. /market links to ~100 company pages
       and /news to 52 articles; fetching each is minutes of work to re-prove
       the same template. A shape is the path with its identifying segment
       collapsed, so /c/TASC and /c/BBOB check once — and a systematic break
       like /en/companies still shows up the first time any page links to it. */
    const shape = h
      .replace(/\/c\/[^/]+/, '/c/:sym')
      .replace(/\/(news|learn|research)\/[^/]+/, '/$1/:slug')
    if (seenShape.has(shape)) continue
    seenShape.add(shape)
    const code = await check(h)
    // 3xx is fine — a redirect is a decision, not a dead end.
    if (code >= 400 || code === 0) bad.push(`${page} links to ${h} → ${code || 'unreachable'}`)
  }
}

if (bad.length) {
  console.error(`✗ ${bad.length} link problem(s)`)
  bad.forEach(b => console.error('  ·', b))
  process.exit(1)
}
console.log(`✓ links: ${arOnly.size} ar-only routes unlinked from shared surfaces; ${status.size} distinct link shapes across ${SAMPLE.length} pages all resolve`)
