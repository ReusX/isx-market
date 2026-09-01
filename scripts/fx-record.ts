/**
 * The FX collection job.
 *
 *   npx tsx scripts/fx-record.ts
 *
 * Run on a schedule by .github/workflows/fx-record.yml. Reads the parallel
 * market and the CBI-published official rate, and appends whatever is
 * materially new to `fx_observations`.
 *
 * ── Why it is safe to run often ───────────────────────────────────────────
 * Every write goes through the database's `dedupe_key`, which covers the
 * source, the source event, the series and the values. Re-reading the same
 * Alsumaria article writes nothing; polling the CBI table hourly collapses to
 * one row a day. So the schedule is chosen for how quickly we want to SEE a
 * change, not for how much history it creates — running it more often cannot
 * inflate the record.
 *
 * ── What makes it fail ────────────────────────────────────────────────────
 * A source being unreachable is a bad afternoon; both being unreachable, or
 * ANY write erroring, is a broken pipeline. The distinction matters because
 * the first version exited 0 while every write in GitHub Actions failed —
 * `createAdminClient()` needs a WebSocket that Node 20 does not have, so the
 * run was green and the table was empty. A write error now fails the job.
 */

import { fetchFx } from '../lib/rates'
import { fetchCbiOfficial, CBI_OFFICIAL_RATE } from '../lib/fxOfficial'
import { record } from '../lib/fxRecord'
import { baghdadDate, cbiWebEvent, alsumariaEvent } from '../lib/fxSeries'

const line = (ok: boolean, msg: string) => console.log(`${ok ? '✓' : '·'} ${msg}`)

/** Set when any write reports `error` — as opposed to a legitimate duplicate. */
let writeError: string | null = null

async function parallel(): Promise<boolean> {
  const fx = await fetchFx()
  if (!fx) { console.error('✗ parallel: source unreachable and no cache'); return false }
  if (fx.stale) {
    /* A cached value is not an observation. Recording it would invent a
       reading the source never published today, which is precisely the
       fabrication this table exists to prevent. */
    line(false, 'parallel: served from cache, nothing observed — not recorded')
    return false
  }
  const r = await record({
    series: 'parallel', location: 'baghdad',
    buy: fx.buy, sell: fx.sell, mid: null,
    observedAt: new Date().toISOString(),
    observedDate: fx.date || baghdadDate(new Date()),
    origin: 'recorded',
    sourceKey: 'alsumaria',
    sourceUrl: fx.sourceUrl,
    sourceEvent: alsumariaEvent(fx.sourceUrl),
    sourceTs: fx.publishedAt ?? null,
    rawExcerpt: fx.excerpt ?? null,
  })
  if (r.outcome === 'error') writeError = r.reason ?? 'unknown'
  line(r.inserted, `parallel: ${fx.buy} / ${fx.sell} on ${fx.date} — ${
    r.outcome === 'inserted' ? 'recorded' : r.outcome === 'duplicate' ? 'already held' : `WRITE FAILED · ${r.reason}`}`)
  return true
}

async function official(): Promise<boolean> {
  const quote = await fetchCbiOfficial()
  if (!quote) {
    line(false, `official: cbi.iq unreachable — fallback constant ${CBI_OFFICIAL_RATE} not recorded`)
    return false
  }
  const now = new Date()
  const day = baghdadDate(now)
  const r = await record({
    series: 'official_cbi', location: 'baghdad',
    /* A policy rate is one number, not a two-sided quote. It goes in `sell`
       so `mid` resolves to it, and `buy` stays null rather than being
       duplicated into a spread that does not exist. */
    buy: null, sell: quote.rate, mid: null,
    observedAt: now.toISOString(),
    observedDate: day,
    origin: 'recorded',
    sourceKey: 'cbi-web',
    sourceUrl: quote.sourceUrl,
    sourceEvent: cbiWebEvent(day),
    rawExcerpt: quote.excerpt,
  })
  if (r.outcome === 'error') writeError = r.reason ?? 'unknown'
  line(r.inserted, `official: ${quote.rate} — ${
    r.outcome === 'inserted' ? 'recorded' : r.outcome === 'duplicate' ? 'already held today' : `WRITE FAILED · ${r.reason}`}`)
  return true
}

/* Wrapped rather than top-level await: the repo transpiles scripts to CJS,
   where top-level await is a syntax error. */
async function main() {
  const [p, o] = await Promise.all([parallel(), official()])
  if (writeError) {
    console.error(`✗ the database write failed: ${writeError}`)
    process.exit(1)
  }
  if (!p && !o) {
    console.error('✗ both sources unreachable')
    process.exit(1)
  }
}

void main()
