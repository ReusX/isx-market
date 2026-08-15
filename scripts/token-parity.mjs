#!/usr/bin/env node
/**
 * Asserts the design-token layer stays internally consistent.
 *
 * Adapted from the archived checker, which read `styles/tokens.css` and
 * `styles/legacy/02-tokens.css` — neither of which exists here. This one reads
 * the files this repo actually has.
 *
 * Three checks, each guarding a failure that ships silently:
 *
 *   1 · THEME PARITY. A token declared in one theme and not the other does not
 *       fail a build, does not warn, and does not show up in review. It renders
 *       perfectly until someone toggles the theme, at which point that one
 *       property falls back to whatever it inherited — usually an invisible
 *       label or a transparent border, in one theme, on one screen.
 *
 *   2 · NO COLLISION WITH THE BASE LAYER. The `--mv-*` layer coexists with the
 *       base tokens that still style every un-migrated page. A name reused
 *       across the two would silently recolour the site.
 *
 *   3 · NO DANGLING REFERENCES. Every `var(--mv-…)` used inside the layer must
 *       be declared by it.
 *
 * Deliberately NOT checked: the specific value of any token. Values are the
 * designer's to change; this gate detects structural drift, not evolution.
 * The one exception is the small PINNED set below — constants the reference
 * app treats as identity, where a change is far more likely to be an accident
 * than a decision.
 *
 *   node scripts/token-parity.mjs
 */

import { readFileSync } from 'node:fs'

const TOKENS = 'styles/design-tokens.css'
const BASE = 'app/globals.css'

/** Reference-app constants that must not drift silently. Brand identity only. */
const PINNED = {
  '--mv-hero': '#3171c6', // Electric Blue, both themes
}

/** Declarations inside the rule whose selector list contains `needle`. */
function declaredIn(css, needle) {
  const found = new Map()
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(css))) {
    if (!m[1].includes(needle)) continue
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      found.set(d[1], d[2].trim())
    }
  }
  return found
}

const css = readFileSync(TOKENS, 'utf8')
const base = readFileSync(BASE, 'utf8')
const errors = []

// ── 1 · theme parity ────────────────────────────────────────────────────────
const light = declaredIn(css, "[data-theme='light']")
const dark = declaredIn(css, "[data-theme='dark']")

for (const k of light.keys()) {
  if (!dark.has(k)) errors.push(`${k} declared in LIGHT but not DARK`)
}
for (const k of dark.keys()) {
  if (!light.has(k)) errors.push(`${k} declared in DARK but not LIGHT`)
}

// ── 2 · collision with the base layer ───────────────────────────────────────
const baseNames = new Set()
for (const d of base.matchAll(/(--[\w-]+)\s*:/g)) baseNames.add(d[1])
const all = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))
for (const k of all) {
  if (baseNames.has(k)) errors.push(`${k} is declared by BOTH the token layer and the base layer`)
}

// ── 3 · dangling references ─────────────────────────────────────────────────
for (const u of css.matchAll(/var\((--mv-[\w-]+)/g)) {
  if (!all.has(u[1])) errors.push(`${u[1]} is used but never declared`)
}

// ── pinned constants ────────────────────────────────────────────────────────
for (const [k, want] of Object.entries(PINNED)) {
  for (const [themeName, set] of [['light', light], ['dark', dark]]) {
    const got = set.get(k)
    if (got && got.toLowerCase() !== want.toLowerCase()) {
      errors.push(`${k} in ${themeName} is ${got}, pinned to ${want}`)
    }
  }
}

if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`)
  console.error(`\n${errors.length} token problem(s) in ${TOKENS}.`)
  process.exit(1)
}

console.log(
  `✓ tokens: ${light.size} per theme in parity, ` +
  `${all.size} total, no base-layer collisions, no dangling refs`
)
