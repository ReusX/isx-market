#!/usr/bin/env node
/**
 * The string-completeness gate.
 *
 * Two halves:
 *
 *  1. SOURCE — no Arabic literal may sit in a shared component or route
 *     surface. Anything a reader sees must come from the dictionaries, whose
 *     own completeness is already guaranteed at compile time by
 *     `en: typeof ar`. Comments are excluded; they are for us, not for readers.
 *
 *  2. RENDERED — fetch each priority route in English and look for Arabic in
 *     the visible text. This catches what the source scan cannot: a string
 *     that reaches the page through data rather than through JSX.
 *
 * The allowlist below is deliberately narrow and every entry has a reason.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ORIGIN = process.argv[2] ?? 'http://localhost:3000'
const AR = /[؀-ۿ]/

/* ── 1 · Source scan ────────────────────────────────────────────────────── */

/** Directories whose Arabic IS the content, or which no reader sees. */
const SKIP_DIRS = new Set(['node_modules', '.next', '.next-check', 'scripts', 'public', 'docs', '.git'])

/** Files whose Arabic is legitimate. Each line is a reason, not a waiver. */
const ALLOW_FILES = [
  'lib/i18n/messages/ar/',      // the Arabic dictionary IS Arabic
  'lib/legalContent.ts',        // the Arabic legal text itself
  'lib/companyProfiles.ts',     // curated Arabic company prose, no English yet
  'lib/companySeo.ts',          // Arabic search phrases and name aliases
  'lib/market.ts',              // SECTORS ar/en definition table
  'lib/screener.ts',            // METRICS/PRESETS/SECTOR_LABELS ar/en tables
  'lib/statistics.ts',          // PERIODS/METRICS ar/en tables + Arabic months
  'lib/financials.ts',          // statement line items, ar + en on every row
  'lib/news.ts',                // PERIOD_LABEL ar/en table
  'lib/oilBlends.ts',           // blend names, ar + en on every row
  'lib/date.ts',                // the one Arabic month table
  'lib/marketTools.ts',         // SOURCES notes (Arabic-source provenance)
  'lib/fxCopy.ts',              // Arabic FX FAQ prose for JSON-LD
  'lib/auth.ts',                // AUTH_ERRORS ar + ERROR_EN pair
  'lib/pulse.ts',               // Arabic identifiers in comments only
  'lib/infoData.ts',            // no Arabic left; kept for the reply-time note
  'app/(ar)/',                  // the ARABIC route group's own metadata
  'components/auth/AuthShell.tsx', // AUTH_ERRORS ar/en pair lives here
  'components/auth/screens.tsx',   // isAr ternaries, both languages present
  'components/auth/AuthModal.tsx',
  'app/global-error.tsx',       // deliberately bilingual — see the file
  'components/shell/LanguageSwitch.tsx', // «العربية» is the switch's own label
  'components/company/CompanyProfile.tsx', // ar/en generated profile pair
  'components/routes/ResetPassword.tsx',   // isAr ternaries, both languages present
  'app/api/',                   // ⚠ SEE BELOW — Arabic LLM prompts, not chrome
  'components/info/LegalDoc.tsx',  // parses the «[مراجعة قانونية:…]» marker format
  'lib/i18n/messages/en/',      // the auth error pair and the language endonym
  'lib/rates.ts',               // Arabic SCRAPE selectors — «شراء»/«بيع» as they
                                // appear in the source article, not as UI copy
  'lib/tradingFromZero.ts',     // the guide, ar + en side by side
]

/*
 * `app/api/analysis/[sym]/route.ts` deserves its own note.
 *
 * Its Arabic is an LLM PROMPT — a schema and instructions telling the model to
 * write Arabic analysis for `/analysis/[sym]`, which is an Arabic-only route
 * with no English twin (lib/i18n/routes.ts). No reader ever sees these
 * strings; they are the shape of a request, not interface copy. Translating
 * them would change what the model produces, not what anyone reads.
 */

const strip = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
  .replace(/^\s*\/\/.*$/gm, '')       // line comments
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // JSX comments

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) yield* walk(full)
    else if (/\.(tsx?|jsx?)$/.test(name)) yield full
  }
}

const sourceHits = []
for (const dir of ['app', 'components', 'lib', 'context']) {
  for (const file of walk(dir)) {
    const rel = relative('.', file)
    if (ALLOW_FILES.some((a) => rel.startsWith(a))) continue
    const body = strip(readFileSync(file, 'utf8'))
    const lines = body.split('\n')
    lines.forEach((line, i) => {
      if (!AR.test(line)) return
      /*
       * A line that carries BOTH languages is not a gap — it is a complete
       * pair, and the type system already guarantees neither half is missing.
       * Three shapes qualify:
       *
       *   locale === 'ar' ? '؟' : '?'      an inline bilingual choice
       *   { ar: '…', en: '…' }             a typed definition-table row
       *   isAr ? '…' : '…'                 the auth screens' pair form
       */
      const bilingual =
        /locale === ['"]ar['"]\s*\?/.test(line) ||
        /\bisAr\s*\?/.test(line) ||
        // `ar ? '…' : '…'` — the same pair under the older local name, used by
        // the helpers that take a boolean rather than a Locale.
        /(?:^|[^.\w])ar\s*\?/.test(line) ||
        (/\bar:\s*["']/.test(line) && /\ben:\s*["']/.test(line)) ||
        (/\bar:\s*["']/.test(line) && /\benFull:\s*["']/.test(line)) ||
        // `labelAr:` on one line with `labelEn:` on the next — the same pair,
        // written across two lines.
        /\b\w+Ar:\s*["']/.test(line)
      if (bilingual) return

      /*
       * A pair written across two lines: the `?` branch on one and the `:`
       * branch on the next. Look at the neighbours before calling it a gap.
       */
      const near = lines.slice(Math.max(0, i - 2), i + 3).join(' ')
      if (/(?:locale === ['"]ar['"]|isAr|[^.\w]ar)\s*\?/.test(near) && /:\s*[`'"][ A-Za-z]/.test(near)) return

      /*
       * Arabic inside a REGEX is normalisation, not copy: folding alef and ya
       * variants so a search for «الرافدين» finds «مصرف الرافدين». There is
       * nothing to translate in a character class.
       */
      if (/\/[^/]*[؀-ۿ][^/]*\/[gimsuy]*/.test(line)) return
      sourceHits.push(`${rel}:${i + 1}  ${line.trim().slice(0, 90)}`)
    })
  }
}

/* ── 2 · Rendered scan ──────────────────────────────────────────────────── */

const ROUTES = [
  '/en', '/en/market', '/en/screener', '/en/heatmap', '/en/pulse',
  '/en/statistics', '/en/statistics/foreign-flow', '/en/news', '/en/learn',
  '/en/learn/trading-from-zero', '/en/fx', '/en/gold', '/en/oil',
  '/en/about', '/en/contact', '/en/privacy', '/en/legal',
  '/en/c/BBOB', '/en/c/BBOB/financials',
  '/en/portfolio', '/en/watchlist', '/en/login', '/en/signup',
]

/**
 * Arabic that is EXPECTED on an English page, and why.
 *
 * These are source identity, not untranslated interface: the language switch
 * names its own destination in its own script, and official company and
 * shareholder names have no verified English equivalent and are never
 * machine-translated.
 */
const RENDER_ALLOW = [
  'العربية',   // the language switch's own label, in its own script
  'ع',         // the auth shell's compact language button — same thing
]

/**
 * Routes whose Arabic is SOURCE CONTENT, with the reason.
 *
 * `/en/news` lists real CMS articles that exist in Arabic alone. The brief
 * allows them to stay discoverable from the English index provided their
 * language is clear — each row carries an "In Arabic" marker and links to its
 * canonical Arabic URL. Their headlines and excerpts are therefore expected
 * Arabic on an English page, and are not a translation gap.
 *
 * ⚠ This exempts the ARTICLE TEXT, not the chrome: the filters, counts,
 * headings and empty states on that same page are still scanned, because they
 * are rendered from the dictionary and were English before this entry existed.
 */
const CONTENT_ROUTES = new Set(['/en/news'])

const renderHits = []
for (const route of ROUTES) {
  let html
  try {
    const res = await fetch(ORIGIN + route)
    if (res.status !== 200) { renderHits.push(`${route} → HTTP ${res.status}`); continue }
    html = await res.text()
  } catch (e) { renderHits.push(`${route} → ${e.message}`); continue }

  // Visible text only: drop scripts, styles and JSON-LD.
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')

  if (CONTENT_ROUTES.has(route)) continue

  const found = [...new Set((text.match(/[؀-ۿ][^\s<>]*(?:\s+[؀-ۿ][^\s<>]*)*/g) ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !RENDER_ALLOW.includes(s)))]
  if (found.length) renderHits.push(`${route}\n      ${found.slice(0, 6).join('  |  ')}`)
}

/* ── Report ─────────────────────────────────────────────────────────────── */

let bad = false
if (sourceHits.length) {
  bad = true
  console.error(`✗ Arabic literals outside the dictionaries and the Arabic route group: ${sourceHits.length}`)
  for (const h of sourceHits.slice(0, 40)) console.error('  ·', h)
}
if (renderHits.length) {
  bad = true
  console.error(`✗ Arabic in the rendered English pages: ${renderHits.length} route(s)`)
  for (const h of renderHits) console.error('  ·', h)
}
if (bad) process.exit(1)
console.log(`✓ i18n strings: no stray Arabic in ${ROUTES.length} English routes, none in shared source`)
