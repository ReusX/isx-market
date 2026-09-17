#!/usr/bin/env node
/**
 * Contrast for the site's theme tokens (app/globals.css), both themes.
 * Text tokens against the page and the panel; up/down; the link blue.
 * Colours are resolved through their var() chains first.
 *
 *   node scripts/contrast.mjs [--verbose]
 */
import { readThemes, resolve } from './lib/themeTokens.mjs'

const { light, dark } = readThemes()
const THEME = {
  light: (k) => resolve(k, light),
  dark: (k) => resolve(k, dark, light),
}

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
  ['--ink', '--page', 4.5, 'body copy on the page'],
  ['--secondary', '--page', 4.5, 'secondary text on the page'],
  ['--muted', '--page', 3.0, 'captions and muted labels'],
  ['--ink', '--surface', 4.5, 'body copy on a panel'],
  ['--secondary', '--surface', 4.5, 'secondary text on a panel'],
  ['--muted', '--surface', 3.0, 'muted labels on a panel'],
  ['--up', '--page', 4.5, 'a rising value'],
  ['--down', '--page', 4.5, 'a falling value'],
  ['--up', '--surface', 4.5, 'a rising value on a panel'],
  ['--down', '--surface', 4.5, 'a falling value on a panel'],
  ['--nav-active', '--page', 3.0, 'links and the focus ring'],
  ['--sel-ink', '--sel-bg', 4.5, 'a selected pill'],
]
/* Dividers have no accessibility minimum; reported with --verbose only. */
const INFORMATIONAL = [['--border', '--page', 'hairline divider']]

const verbose = process.argv.includes('--verbose')
const fails = []
let checked = 0

for (const theme of ['light', 'dark']) {
  const t = THEME[theme]
  if (verbose) console.log(`\n── ${theme} ──`)
  for (const [token, bgKey, min, what] of PAIRS) {
    const fg = t(token)
    const bg = t(bgKey)
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
      const fg = t(token)
      const bg = t(bgKey)
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
