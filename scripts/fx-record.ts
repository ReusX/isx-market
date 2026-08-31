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
 * The job prints what it did and exits 0 unless BOTH sources fail. One source
 * being down is a bad afternoon, not a broken pipeline, and failing the
 * workflow for it would train everyone to ignore the red.
 */

import { fetchFx } from '../lib/rates'
import { fetchCbiOfficial, CBI_OFFICIAL_RATE } from '../lib/fxOfficial'
import { record } from '../lib/fxRecord'
import { baghdadDate, cbiWebEvent, alsumariaEvent } from '../lib/fxSeries'

const line = (ok: boolean, msg: string) => console.log(`${ok ? '✓' : '·'} ${msg}`)

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
  line(r.inserted, `parallel: ${fx.buy} / ${fx.sell} on ${fx.date} — ${r.inserted ? 'recorded' : r.reason ?? 'already held'}`)
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
  line(r.inserted, `official: ${quote.rate} — ${r.inserted ? 'recorded' : r.reason ?? 'already held today'}`)
  return true
}

/* Wrapped rather than top-level await: the repo transpiles scripts to CJS,
   where top-level await is a syntax error. */
async function main() {
  const [p, o] = await Promise.all([parallel(), official()])
  if (!p && !o) {
    console.error('✗ both sources failed')
    process.exit(1)
  }
}

void main()
