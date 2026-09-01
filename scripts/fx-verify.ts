/**
 * Self-test for the observation write path.
 *
 *   npx tsx scripts/fx-verify.ts
 *
 * Proves, against the real database, the four behaviours the whole design
 * rests on:
 *
 *   1. a genuinely new observation inserts
 *   2. the same source event fetched again does NOT insert
 *   3. the same source event with a CHANGED rate inserts as a correction,
 *      leaving both values visible
 *   4. a write that cannot succeed reports `error`, never `duplicate`
 *
 * (4) is the one that matters most. `record()` first returned a boolean, and a
 * run with no credentials that wrote nothing reported «0 new, 5497 already
 * held» — a clean bill of health for a total failure. A duplicate and an error
 * are different events and this asserts they stay distinguishable.
 *
 * Every row it creates uses a `verify:` source event and is deleted at the
 * end, including when an assertion fails.
 */

import { record } from '../lib/fxRecord'

const TAG = `verify:${Date.now()}`
const base = {
  series: 'parallel' as const,
  location: 'baghdad' as const,
  mid: null,
  observedAt: new Date().toISOString(),
  observedDate: '1999-01-01',   // far outside any real window
  origin: 'recorded' as const,
  sourceKey: 'alsumaria',
  sourceUrl: 'https://example.invalid/verify',
  sourceEvent: TAG,
  rawExcerpt: 'synthetic verification row',
}

let failed = 0
function expect(label: string, got: string, want: string) {
  const ok = got === want
  if (!ok) failed++
  console.log(`  ${ok ? '✓' : '✗'} ${label}: ${got}${ok ? '' : ` (expected ${want})`}`)
}

async function cleanup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  await fetch(`${url}/rest/v1/fx_observations?source_event=like.verify:*`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  }).catch(() => {})
}

async function main() {
  console.log('fx write-path verification')

  const a = await record({ ...base, buy: 1500, sell: 1510 })
  expect('new observation inserts', a.outcome, 'inserted')

  const b = await record({ ...base, buy: 1500, sell: 1510 })
  expect('same event, same values skips', b.outcome, 'duplicate')

  const c = await record({ ...base, buy: 1500, sell: 1520 })
  expect('same event, corrected rate inserts', c.outcome, 'inserted')

  const d = await record({ ...base, buy: 1500, sell: 1530, sourceKey: 'no-such-source' })
  expect('unwritable row reports error, not duplicate', d.outcome, 'error')

  /* Both values of the corrected event must still be readable — a correction
     that overwrites is exactly what the append-only rule forbids. */
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key) {
    const res = await fetch(
      `${url}/rest/v1/fx_observations?select=sell&source_event=eq.${TAG}&order=id`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    )
    const rows = (await res.json()) as { sell: number }[]
    expect('both values of the correction survive', rows.map((r) => Number(r.sell)).join('/'), '1510/1520')
  }

  await cleanup()
  if (failed) {
    console.error(`✗ ${failed} expectation(s) failed`)
    process.exit(1)
  }
  console.log('✓ write path behaves as specified')
}

main().catch(async (e) => {
  await cleanup()
  console.error('✗', e instanceof Error ? e.message : e)
  process.exit(1)
})
