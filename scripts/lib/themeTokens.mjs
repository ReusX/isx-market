/**
 * The site's theme tokens, read from app/globals.css.
 *
 *   light  · the bare `:root { … }` block (primitives + light roles)
 *   dark   · `:root[data-theme='dark'] { … }` (role overrides)
 *   system · `:root:not([data-theme='light'])` inside the dark media query
 *
 * `resolve()` follows `var(--x)` chains inside one theme, falling back to
 * the light primitives, so a gate compares colours, not references.
 */
import { readFileSync } from 'node:fs'

export const GLOBALS = 'app/globals.css'

/** Top-level rule bodies keyed by the exact selector, media blocks flattened. */
function blocks(css) {
  const out = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(css))) out.push([m[1].trim(), m[2]])
  return out
}
function decls(body) {
  const found = new Map()
  for (const d of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) found.set(d[1], d[2].trim())
  return found
}

export function readThemes(path = GLOBALS) {
  const css = readFileSync(path, 'utf8')
  const bs = blocks(css)
  const pick = (sel) => bs.filter(([s]) => s.endsWith(sel) || s === sel).map(([, b]) => decls(b))
  const merge = (maps) => maps.reduce((acc, m) => { for (const [k, v] of m) acc.set(k, v); return acc }, new Map())
  const light = merge(pick(':root'))
  const dark = merge(pick(":root[data-theme='dark']"))
  const system = merge(pick(":root:not([data-theme='light'])"))
  return { css, light, dark, system }
}

/** Resolve a token to a literal colour string within `theme` (a Map), then `fallback`. */
export function resolve(name, theme, fallback, depth = 0) {
  const raw = theme.get(name) ?? fallback?.get(name)
  if (raw == null || depth > 12) return null
  const m = /^var\((--[\w-]+)\)$/.exec(raw.trim())
  return m ? resolve(m[1], theme, fallback, depth + 1) : raw.trim()
}
