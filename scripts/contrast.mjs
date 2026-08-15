#!/usr/bin/env node
/**
 * WCAG contrast audit of the design-token layer, both themes.
 *
 * Adapted from the archived checker to read `styles/design-tokens.css`.
 *
 * The pairs below are the ones a user actually reads. Each names the surface
 * it is read against, because a colour has no contrast on its own — half of
 * all contrast bugs are a correct colour on an unexpected background.
 *
 * Alpha values are composited over their stated base before measuring; an
 * rgba() line at 9% opacity is not a colour until it is on something.
 *
 *   node scripts/contrast.mjs [--verbose]
 */

import { readFileSync } from 'node:fs'

const TOKENS = 'styles/design-tokens.css'
const css = readFileSync(TOKENS, 'utf8')

function declaredIn(needle) {
  const found = new Map()
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(css))) {
    if (!m[1].includes(needle)) continue
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) found.set(d[1], d[2].trim())
  }
  return found
}

const THEME = {
  light: declaredIn("[data-theme='light']"),
  dark: declaredIn("[data-theme='dark']"),
}

/* The environment gradients are not flat, so contrast is measured against the
   dominant stop of each — the colour that occupies most of the page. */
const ENV = { light: '#f4f3f1', dark: '#161616' }

function parse(c) {
  c = c.trim()
  let m = /^#([0-9a-f]{6})$/i.exec(c)
  if (m) {
    const n = parseInt(m[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  m = /^rgba?\(([^)]+)\)$/i.exec(c)
  if (m) {
    const p = m[1].split(',').map(s => parseFloat(s))
    return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]
  }
  return null
}

/** Composite `fg` (which may be translucent) over opaque `bg`. */
function over(fg, bg) {
  const a = fg[3]
  return [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a))
}

function lum(rgb) {
  const [r, g, b] = rgb.map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(fgRaw, bgRaw) {
  const bg = over(parse(bgRaw), [255, 255, 255, 1])
  const fg = over(parse(fgRaw), bg)
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

/* [token, background, minimum, what it is]
   4.5 = body text · 3.0 = large text (≥18.66px bold / 24px) and UI boundaries. */
const PAIRS = [
  ['--mv-ink', 'ENV', 4.5, 'body copy on the page'],
  ['--mv-ink-2', 'ENV', 4.5, 'secondary text on the page'],
  ['--mv-ink-3', 'ENV', 3.0, 'captions and muted labels'],
  ['--mv-ink', 'PANEL', 4.5, 'body copy on a panel'],
  ['--mv-ink-2', 'PANEL', 4.5, 'secondary text on a panel'],
  ['--mv-ink-3', 'PANEL', 3.0, 'muted labels on a panel'],
  ['--mv-up', 'ENV', 4.5, 'a rising value'],
  ['--mv-down', 'ENV', 4.5, 'a falling value'],
  ['--mv-up', 'PANEL', 4.5, 'a rising value on a panel'],
  ['--mv-down', 'PANEL', 4.5, 'a falling value on a panel'],
  ['--mv-hero-bright', 'ENV', 3.0, 'links and the focus ring'],
]

/* Reported, never failed. WCAG 1.4.11 sets 3:1 for UI components and
   meaningful graphics; a divider is neither — how subtle it should be is a
   design decision, not an accessibility one. An earlier draft of this gate
   failed `--mv-line-strong` against an invented 1.4:1 minimum, which would
   have pressured an approved colour to satisfy a rule that does not exist. */
const INFORMATIONAL = [
  ['--mv-line', 'ENV', 'hairline divider'],
  ['--mv-line-strong', 'ENV', 'emphasis divider'],
]

const verbose = process.argv.includes('--verbose')
const fails = []
let checked = 0

for (const theme of ['light', 'dark']) {
  const t = THEME[theme]
  if (verbose) console.log(`\n── ${theme} ──`)
  for (const [token, bgKey, min, what] of PAIRS) {
    const fg = t.get(token)
    const bg = bgKey === 'ENV' ? ENV[theme] : t.get('--mv-panel-solid')
    if (!fg || !bg) continue
    const r = ratio(fg, bg)
    checked++
    const ok = r >= min
    if (!ok) fails.push({ theme, token, bgKey, min, r, what })
    if (verbose || !ok) {
      console.log(`  ${ok ? '✓' : '✗'} ${token.padEnd(18)} on ${bgKey.padEnd(6)} ${r.toFixed(2)}:1 (min ${min})  ${what}`)
    }
  }
  if (verbose) {
    for (const [token, bgKey, what] of INFORMATIONAL) {
      const fg = t.get(token)
      const bg = bgKey === 'ENV' ? ENV[theme] : t.get('--mv-panel-solid')
      if (!fg || !bg) continue
      console.log(`  · ${token.padEnd(18)} on ${bgKey.padEnd(6)} ${ratio(fg, bg).toFixed(2)}:1 (no minimum)  ${what}`)
    }
  }
}

if (fails.length) {
  console.error(`\n${fails.length} pair(s) below the minimum:\n`)
  for (const f of fails) {
    console.error(`  ${f.theme}  ${f.token} on ${f.bgKey}  ${f.r.toFixed(2)}:1 < ${f.min}:1 — ${f.what}`)
  }
  console.error(
    `\nDo not silently change an approved colour to clear this. Report the exact\n` +
    `pair, then make the smallest visually faithful correction.`
  )
  process.exit(1)
}

console.log(`✓ contrast: ${checked} pairs pass in both themes`)
