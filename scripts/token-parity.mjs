#!/usr/bin/env node
/**
 * Theme parity for the site's tokens (app/globals.css).
 *
 *   1. every ROLE token the pages use is declared in light AND in dark
 *      (and in the system-dark block, which must mirror explicit dark)
 *   2. dark declares nothing light does not (a token only dark knows is a
 *      label that vanishes in light)
 *   3. every `var(--x)` used in the live stylesheets resolves to a token
 *      declared somewhere in globals.css
 *   4. the one brand constant is pinned
 *
 *   node scripts/token-parity.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { readThemes, resolve } from './lib/themeTokens.mjs'

const ROLES = ['--page', '--surface', '--surface-2', '--ink', '--secondary', '--muted', '--accent', '--nav-active', '--up', '--down', '--border', '--sel-bg', '--sel-ink']
const PINNED = { '--blue': '#146bfd' }

const { css, light, dark, system } = readThemes()
const errors = []

for (const k of ROLES) {
  if (!light.has(k)) errors.push(`${k} missing from the light :root block`)
  if (!dark.has(k)) errors.push(`${k} missing from [data-theme='dark']`)
  if (!system.has(k)) errors.push(`${k} missing from the system-dark block`)
  else if (system.get(k) !== dark.get(k)) errors.push(`${k}: system-dark (${system.get(k)}) ≠ explicit dark (${dark.get(k)})`)
}
for (const k of dark.keys()) if (!light.has(k)) errors.push(`${k} declared in DARK but not LIGHT`)

// Every var() used by a live stylesheet must be declared somewhere.
const declared = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
const files = readdirSync('styles').filter((f) => f.endsWith('.css')).map((f) => `styles/${f}`)
for (const f of files) {
  const s = readFileSync(f, 'utf8')
  for (const d of s.matchAll(/(--[\w-]+)\s*:/g)) declared.add(d[1])   // page-local tokens count too
}
/* Tokens set from JavaScript — next/font's `variable` names on <html>, and
   style-prop tokens like `--cols` — are declared too, just not in CSS. */
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.match(/\.tsx?$/) ? [`${dir}/${e.name}`] : [])
for (const f of [...walk('components'), ...walk('app'), ...walk('lib')]) {
  const s = readFileSync(f, 'utf8')
  for (const d of s.matchAll(/['"`](--[\w-]+)['"`]/g)) declared.add(d[1])
}
for (const f of [...files, 'app/globals.css']) {
  const s = readFileSync(f, 'utf8')
  for (const u of s.matchAll(/var\((--[\w-]+)/g)) if (!declared.has(u[1])) errors.push(`${u[1]} used in ${f} but never declared`)
}

for (const [k, want] of Object.entries(PINNED)) {
  const got = resolve(k, light)
  if (got && got.toLowerCase() !== want.toLowerCase()) errors.push(`${k} is ${got}, pinned to ${want}`)
}

if (errors.length) {
  for (const e of [...new Set(errors)]) console.error(`✗ ${e}`)
  console.error(`\n${new Set(errors).size} token problem(s).`)
  process.exit(1)
}
console.log(`✓ tokens: ${ROLES.length} roles in parity across light · dark · system-dark, ${declared.size} tokens declared, no dangling refs`)
