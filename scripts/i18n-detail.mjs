/**
 * Detail-route gate — the one the last pre-deploy gate was missing.
 *
 * `check:i18n` walks a FIXED list of routes, and every article route is a
 * dynamic segment, so no article was ever requested. `/news/[slug]` returned
 * HTTP 500 on every article in the production build — `ArticleView` called
 * `useLocale()` without `'use client'` — and the whole suite still went green:
 * tsc passes, the build passes (a dynamic route only fails at request time),
 * and the dev server renders it fine.
 *
 * So this gate does what the others cannot: it DISCOVERS real article URLs
 * from the live sitemap rather than hard-coding a slug that the CMS may drop,
 * fetches them, and checks that a body actually rendered — status alone would
 * not have caught a page that 200s with an empty shell, which is the second
 * defect this same pass found on /verify-email.
 *
 *   node scripts/i18n-detail.mjs [origin]
 */
const ORIGIN = process.argv[2] ?? process.env.I18N_ORIGIN ?? 'http://localhost:3000'
const bad = []

const body = async (path) => {
  const res = await fetch(ORIGIN + path)
  return { status: res.status, html: res.status === 200 ? await res.text() : '' }
}

/**
 * Meaningful CONTENT, not just a 200: a landmark, a heading with words in it,
 * and real text in the document itself.
 *
 * `minText` is a floor against an EMPTY shell, not a quality bar — the broken
 * /verify-email shipped 22 characters, while a legitimate English auth page is
 * only ~230 because it is a title, a sentence and a form. Set it low enough
 * that a terse page passes and a fallback-only document cannot.
 */
function checkShell(label, html, { minText = 150, needsForm = false } = {}) {
  const mains = (html.match(/<main[\s>]/g) ?? []).length
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length
  const h1Text = (html.match(/<h1[^>]*>([^<]*)</) ?? [])[1]?.trim() ?? ''
  // strip script/style, then tags, to approximate what a reader (or a crawler
  // with JS off) actually receives from the document itself.
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (mains !== 1) bad.push(`${label} has ${mains} <main>`)
  if (h1 !== 1) bad.push(`${label} has ${h1} <h1>`)
  if (!h1Text) bad.push(`${label} has an empty <h1>`)
  if (needsForm && !/<form[\s>]/.test(html)) bad.push(`${label} prerendered no form`)
  if (text.length < minText) bad.push(`${label} prerendered text is ${text.length} chars — empty shell?`)
  return text
}

// ── Article routes, discovered from the sitemap ───────────────────────────
const sitemap = await (await fetch(`${ORIGIN}/sitemap.xml`)).text()
const articles = [...sitemap.matchAll(/<loc>[^<]*?(\/news\/[^<]+)<\/loc>/g)].map(m => m[1]).slice(0, 3)

if (articles.length < 2) {
  bad.push(`sitemap offered ${articles.length} /news/ URLs — cannot verify article rendering`)
} else {
  for (const path of articles) {
    const { status, html } = await body(path)
    if (status !== 200) { bad.push(`${path} → ${status}`); continue }
    const label = decodeURIComponent(path).slice(0, 48)
    checkShell(label, html, { minText: 600 })
    // The article's own body has to be there, not just the shell around it.
    if (!/class="ln-prose/.test(html)) bad.push(`${label} rendered no article body`)
    // A related/prev/next rail must never point back at the article you are on.
    const self = path.replace(/\/$/, '')
    const links = [...html.matchAll(/href="(\/news\/[^"]+)"/g)].map(m => m[1].replace(/\/$/, ''))
    if (links.filter(l => l === self).length) bad.push(`${label} links to itself in related/prev/next`)
  }
}

// The supported Learn detail route.
{
  const { status, html } = await body('/learn/trading-from-zero')
  if (status !== 200) bad.push(`/learn/trading-from-zero → ${status}`)
  else checkShell('/learn/trading-from-zero', html, { minText: 600 })
}

// ── Prerender shells that used to ship empty ──────────────────────────────
for (const path of ['/verify-email', '/en/verify-email', '/login', '/en/login']) {
  const { status, html } = await body(path)
  if (status !== 200) { bad.push(`${path} → ${status}`); continue }
  /* The form is the point of the assertion: /verify-email prerendered as the
     empty <Suspense> fallback, so the resend form simply was not in the
     document a crawler or a JS-off reader received. */
  checkShell(path, html, { needsForm: true })
}

if (bad.length) { console.error(`✗ ${bad.length} problem(s)`); bad.forEach(b => console.error('  ·', b)); process.exit(1) }
console.log(`✓ detail routes: ${articles.length} discovered articles + learn guide render a body; 4 auth shells prerender real content`)
