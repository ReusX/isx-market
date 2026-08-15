#!/usr/bin/env node
/**
 * Guards the static/dynamic rendering mode of every route.
 *
 * Why this exists
 * ---------------
 * A handful of routes on this site are static on purpose and it took real work
 * to get them there: /fx, /gold and /oil are `force-static` with a revalidate
 * window, and the tab-switch latency difference between static and dynamic on
 * those pages is roughly 2.5s vs instant. The SEO pages depend on it too.
 *
 * The problem is that a route falls out of static rendering SILENTLY. No error,
 * no warning — one of these appears somewhere in the tree and the marker in the
 * build table quietly flips from ○ to ƒ:
 *
 *   · `headers()`, `cookies()` or `draftMode()` anywhere in the render path
 *   · `useSearchParams()` in a client component not wrapped in <Suspense>
 *   · a fetch with `cache: 'no-store'`, or `unstable_noStore()`
 *   · reading the Supabase server client (it calls `cookies()`)
 *
 * Every one of those is a reasonable-looking line of code. Code review does not
 * reliably catch them, and by the time anyone notices, it is weeks later and the
 * cause is buried. So this is a machine check instead.
 *
 * Usage
 * -----
 *   npm run build > /tmp/build.log 2>&1
 *   node scripts/route-markers.mjs /tmp/build.log          # verify
 *   node scripts/route-markers.mjs /tmp/build.log --update # accept new baseline
 *
 * Exits non-zero when a route regresses from static to dynamic, or when a route
 * in the baseline vanishes from the build.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASELINE = join(HERE, 'route-markers.json')

/*
 * Next prints the table as e.g.  `├ ○ /fx    1.79 kB   164 kB`.
 * ○ static · ● SSG with generateStaticParams · ƒ dynamic (server-rendered).
 * ● and ○ are both "prerendered" for our purposes — the regression we care
 * about is either of them becoming ƒ.
 */
const ROW = /^[┌├└]\s+([○●ƒλ])\s+(\S+)/
const PRERENDERED = new Set(['○', '●'])

function parse(log) {
  const routes = {}
  for (const line of log.split('\n')) {
    // The build prints two tables (app and pages); this repo only has app.
    const m = ROW.exec(line.trim())
    if (m) routes[m[2]] = m[1]
  }
  return routes
}

const [, , logPath, ...flags] = process.argv
const update = flags.includes('--update')

if (!logPath) {
  console.error('usage: node scripts/route-markers.mjs <build.log> [--update]')
  process.exit(2)
}

const current = parse(readFileSync(logPath, 'utf8'))

if (Object.keys(current).length === 0) {
  console.error(
    `✗ No route table found in ${logPath}.\n` +
    `  The build probably failed, or the log was truncated. Note that\n` +
    `  \`next build\` buffers all of its output until it finishes, so a log\n` +
    `  that looks empty mid-build is normal — wait for the process to exit.`
  )
  process.exit(2)
}

if (update || !existsSync(BASELINE)) {
  writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n')
  const n = Object.values(current).filter(m => PRERENDERED.has(m)).length
  console.log(
    `✓ Baseline written: ${Object.keys(current).length} routes ` +
    `(${n} prerendered, ${Object.keys(current).length - n} dynamic)`
  )
  process.exit(0)
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'))
const regressed = []
const missing = []
const added = []
const improved = []

for (const [route, was] of Object.entries(baseline)) {
  const now = current[route]
  if (!now) { missing.push(route); continue }
  if (PRERENDERED.has(was) && !PRERENDERED.has(now)) regressed.push({ route, was, now })
  if (!PRERENDERED.has(was) && PRERENDERED.has(now)) improved.push({ route, was, now })
}
for (const route of Object.keys(current)) {
  if (!(route in baseline)) added.push(route)
}

for (const { route, was, now } of regressed) {
  console.error(`✗ ${route}  ${was} → ${now}   NO LONGER PRERENDERED`)
}
for (const route of missing) {
  console.error(`✗ ${route}  vanished from the build`)
}
for (const { route, was, now } of improved) {
  console.log(`· ${route}  ${was} → ${now}  (now prerendered — rerun with --update to accept)`)
}
for (const route of added) {
  console.log(`+ ${route}  ${current[route]}  (new route — rerun with --update to accept)`)
}

if (regressed.length || missing.length) {
  console.error(
    `\n${regressed.length + missing.length} route(s) regressed.\n` +
    `If this was intentional, rerun with --update. If it was not, look for\n` +
    `headers()/cookies(), an unsuspended useSearchParams(), cache:'no-store',\n` +
    `or a Supabase server client added to that route's tree.`
  )
  process.exit(1)
}

console.log(`✓ ${Object.keys(baseline).length} routes, no rendering-mode regressions`)
