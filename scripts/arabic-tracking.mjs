#!/usr/bin/env node
/**
 * Catches positive letter-spacing that would land on Arabic UI text.
 *
 * Arabic is a joining script. Tracking pulls the connections apart and makes
 * text genuinely harder to read — not a stylistic quibble, a legibility bug.
 * The trap is that tracking belongs on small upper-case labels: eyebrows,
 * table headers, tab labels. That is exactly the set of elements that get
 * translated, so the rule cannot live in each component's head.
 *
 * This is a REGRESSION GUARD. The audit that prompted it found no active bug
 * in this repo, and it should keep finding none.
 *
 * ── Staying low-noise ──────────────────────────────────────────────────────
 * A gate that cries wolf gets disabled, so this one only flags a rule when the
 * text it targets could plausibly be Arabic. It exempts, by selector:
 *
 *   · monospace / numeric / tabular contexts   (prices, tickers, codes)
 *   · anything explicitly `[dir="ltr"]` or `:lang(en)`
 *   · the chart watermark and other known-Latin ornaments
 *   · classes carrying an opt-in marker (`.mv-track`, `.track-wide`)
 *
 * Anything genuinely Latin-only that trips it should be added to LATIN_ONLY
 * with a reason, rather than the check being loosened.
 *
 *   node scripts/arabic-tracking.mjs [--verbose]
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOTS = ['app', 'styles', 'components']

/** Selectors whose content is Latin by construction. Each needs a reason. */
const LATIN_ONLY = [
  ['.chart-watermark', 'the ticker symbol drawn behind a chart — Latin glyphs only'],
  ['bdi', 'bidi-isolated numerals; already pinned to the numeric font'],
  ['.numeric', 'the numeric/tabular class'],
  ['.mv-track', 'the design layer\'s explicit opt-in'],
  ['.track-wide', 'legacy opt-in for Latin islands'],
  ['[dir="ltr"]', 'explicitly LTR'],
  ['[dir=\'ltr\']', 'explicitly LTR'],
  [':lang(en)', 'explicitly English'],
  ['kbd', 'keyboard shortcut glyphs'],
  ['font-family: var(--font-numeric)', 'a mono/numeric rule'],
  ['font-family: var(--font-mono)', 'a mono/numeric rule'],
  /* The `font:` shorthand carries exactly the same signal as `font-family`,
     and two route ports have now tripped on the difference — a ticker chip
     that sets its face through the shorthand looked like untracked Arabic.
     Same rule, either spelling. */
  ['var(--font-numeric)', 'a mono/numeric rule, in either spelling'],
  /* The literal string "PDF" on a filing row's document badge. It is a
     three-letter Latin acronym rendered from a hard-coded literal in
     NewsClient.tsx, never from data, so it cannot become Arabic. */
  ['.nw-doc i', 'the literal "PDF" badge on a filing row'],
]

function files(dir, out = []) {
  let entries
  try { entries = readdirSync(dir) } catch { return out }
  for (const e of entries) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) { files(p, out); continue }
    if (['.css', '.tsx', '.ts'].includes(extname(p))) out.push(p)
  }
  return out
}

/** Positive tracking, in any unit. `normal`, `0` and negatives are fine. */
function isPositive(value) {
  const v = value.trim().toLowerCase()
  if (v === 'normal' || v === 'revert-layer' || v === 'inherit' || v === 'unset') return false
  const n = parseFloat(v)
  return Number.isFinite(n) && n > 0
}

const verbose = process.argv.includes('--verbose')
const hits = []
let scanned = 0
let exempted = 0

for (const root of ROOTS) {
  for (const file of files(root)) {
    const src = readFileSync(file, 'utf8')
    const lines = src.split('\n')

    lines.forEach((line, i) => {
      const m = /letter-spacing\s*:\s*([^;'"`}]+)/.exec(line)
      if (!m || !isPositive(m[1])) return
      scanned++

      // The selector is whatever precedes this declaration in its block, so
      // look back to the nearest `{` and take the line above it.
      let context = line
      for (let k = i; k >= 0 && k > i - 12; k--) {
        context += '\n' + lines[k]
        if (lines[k].includes('{')) break
      }

      const exempt = LATIN_ONLY.find(([sel]) => context.includes(sel))
      if (exempt) {
        exempted++
        if (verbose) console.log(`  · ${file}:${i + 1}  exempt — ${exempt[1]}`)
        return
      }
      hits.push({ file, line: i + 1, value: m[1].trim(), context: context.split('\n')[0].trim() })
    })
  }
}

if (hits.length) {
  console.error('✗ positive letter-spacing that may reach Arabic text:\n')
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  letter-spacing: ${h.value}`)
    console.error(`      ${h.context}`)
  }
  console.error(
    `\nArabic is a joining script; tracking breaks the joins. Either scope the\n` +
    `rule to Latin content, or add its selector to LATIN_ONLY in this file with\n` +
    `a reason if the text genuinely cannot be Arabic.`
  )
  process.exit(1)
}

console.log(`✓ arabic tracking: ${scanned} positive letter-spacing rule(s), ${exempted} exempt, 0 reaching Arabic`)
