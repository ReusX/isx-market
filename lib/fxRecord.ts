/**
 * Writing observations into `fx_observations`.
 *
 * ── Ownership, stated once so it stays true ───────────────────────────────
 *   rates_cache        one row, overwritten. The last-known-good value that
 *                      `readFxCache()` serves when the source is unreachable.
 *                      Resilience only. Untouched by this module.
 *   fx_observations    append-only. THE historical record. Never updated,
 *                      never deleted.
 *
 * New history must never depend on the cache, and the cache must never be
 * asked a historical question.
 *
 * ── Why every write is safe to repeat ─────────────────────────────────────
 * `fetchFx()` runs on every ISR revalidation of /fx, not only on the cron. If
 * a write inserted unconditionally, a page that happened to be popular would
 * appear to be a volatile market. The database's `dedupe_key` covers
 * (source, event, series, location, buy, sell), so re-reading the same article
 * writes nothing, while an article silently corrected to a different rate
 * writes a second row and both stay visible.
 *
 * `record()` reports which happened, so a cron log shows real publications
 * rather than a tick for every run.
 */

import { baghdadDate, type FxObservation } from '@/lib/fxSeries'

/**
 * Three outcomes, not two.
 *
 * The first version of this returned `{ inserted: boolean }`, and the history
 * importer counted every non-insert as "already held". When the job ran without
 * credentials it wrote nothing at all and reported «0 new, 5497 already held» —
 * a clean bill of health for a total failure. A duplicate and an error are
 * different events and callers must be able to tell them apart.
 */
export type RecordOutcome = 'inserted' | 'duplicate' | 'error'
export type RecordResult = { outcome: RecordOutcome; inserted: boolean; reason?: string }

/** Cheap, dependency-free fingerprint of the parsed sentence. Not a security
 *  hash — it exists so a later disagreement can be settled by asking whether
 *  the source text changed or the parser misread it. */
export function fingerprint(text: string): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 + c, 0x85ebca6b) ^ (h2 >>> 13)
  }
  return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'))
}

let sourceIds: Map<string, number> | null = null

async function sourceId(sb: SbAdmin, key: string): Promise<number | null> {
  if (!sourceIds) {
    const { data } = await sb.from('data_sources').select('id,key')
    sourceIds = new Map(((data as { id: number; key: string }[]) ?? []).map((r) => [r.key, r.id]))
  }
  return sourceIds.get(key) ?? null
}

type SbAdmin = ReturnType<typeof import('@/lib/supabase/server')['createAdminClient']>

/**
 * Append one observation. Returns whether a row was actually created.
 *
 * Failure is deliberately soft: recording is an enhancement to serving a rate,
 * and a page that renders the correct number must not 500 because the archive
 * write failed. The caller logs the reason.
 */
export async function record(obs: FxObservation): Promise<RecordResult> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const sb = createAdminClient()
    const sid = await sourceId(sb, obs.sourceKey)
    if (!sid) return { outcome: 'error', inserted: false, reason: `unknown source '${obs.sourceKey}'` }

    /* `ignore-duplicates` on the dedupe key turns the expected repeat into a
       no-op rather than a 409 the caller has to interpret. */
    const { data, error } = await sb
      .from('fx_observations')
      .upsert(
        {
          series: obs.series,
          location: obs.location,
          buy: obs.buy,
          sell: obs.sell,
          observed_at: obs.observedAt,
          observed_date: obs.observedDate,
          origin: obs.origin,
          source_id: sid,
          source_url: obs.sourceUrl ?? null,
          source_event: obs.sourceEvent,
          source_ts: obs.sourceTs ?? null,
          raw_excerpt: obs.rawExcerpt ?? null,
          content_hash: obs.rawExcerpt ? fingerprint(obs.rawExcerpt) : null,
        },
        { onConflict: 'dedupe_key', ignoreDuplicates: true },
      )
      .select('id')

    if (error) return { outcome: 'error', inserted: false, reason: error.message }
    /* With `ignoreDuplicates`, PostgREST returns the row on a real insert and
       nothing on a conflict — so an empty result here means the observation was
       already held, not that the write failed. Errors were caught above. */
    const inserted = (data?.length ?? 0) > 0
    return { outcome: inserted ? 'inserted' : 'duplicate', inserted }
  } catch (e) {
    return { outcome: 'error', inserted: false, reason: e instanceof Error ? e.message : 'unknown' }
  }
}

/**
 * Bulk append, for the history importer.
 *
 * `record()` is one row per round trip, which is right for the collection job
 * (two observations a run) and hopeless for a backfill: 5,497 sequential
 * inserts did not finish inside ten minutes. Same table, same dedupe key, same
 * three-state outcome — just batched.
 */
export async function recordMany(
  rows: FxObservation[],
  chunk = 500,
): Promise<{ attempted: number; failed: number; reasons: string[] }> {
  const out = { attempted: 0, failed: 0, reasons: [] as string[] }
  if (!rows.length) return out
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const sb = createAdminClient()
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk)
      const ids = await Promise.all(slice.map((o) => sourceId(sb, o.sourceKey)))
      const payload = slice.map((o, k) => ({
        series: o.series, location: o.location, buy: o.buy, sell: o.sell,
        observed_at: o.observedAt, observed_date: o.observedDate, origin: o.origin,
        source_id: ids[k], source_url: o.sourceUrl ?? null, source_event: o.sourceEvent,
        source_ts: o.sourceTs ?? null, raw_excerpt: o.rawExcerpt ?? null,
        content_hash: o.rawExcerpt ? fingerprint(o.rawExcerpt) : null,
      }))
      if (payload.some((p) => !p.source_id)) {
        out.failed += slice.length
        out.reasons.push('unknown source key in batch')
        continue
      }
      const { data, error } = await sb
        .from('fx_observations')
        .upsert(payload, { onConflict: 'dedupe_key', ignoreDuplicates: true })
        .select('id')
      if (error) {
        out.failed += slice.length
        if (!out.reasons.includes(error.message)) out.reasons.push(error.message)
        continue
      }
      /* `ignoreDuplicates` makes PostgREST return an empty representation
         even for rows it did insert, so `data.length` cannot be trusted here.
         The caller counts the table before and after instead — the database is
         the only witness that cannot be wrong about what it stored. */
      void data
      out.attempted += slice.length
    }
  } catch (e) {
    out.failed += rows.length
    out.reasons.push(e instanceof Error ? e.message : 'unknown')
  }
  return out
}

/** Convenience for the live parallel quote coming out of `fetchFx()`. */
export async function recordParallel(fx: {
  buy: number | null
  sell: number | null
  date: string
  sourceUrl?: string | null
  excerpt?: string | null
  publishedAt?: string | null
  event: string
}): Promise<RecordResult> {
  if (fx.buy == null && fx.sell == null) return { outcome: 'error', inserted: false, reason: 'no value' }
  const now = new Date()
  return record({
    series: 'parallel',
    location: 'baghdad',
    buy: fx.buy,
    sell: fx.sell,
    mid: null,
    /* The article states a DATE, not a time. `observed_at` therefore records
       when we read it, and `observed_date` the day the source assigned the
       quote to — which is why the two are separate columns and why the day is
       not simply derived from the timestamp. */
    observedAt: now.toISOString(),
    observedDate: fx.date || baghdadDate(now),
    origin: 'recorded',
    sourceKey: 'alsumaria',
    sourceUrl: fx.sourceUrl ?? null,
    sourceEvent: fx.event,
    sourceTs: fx.publishedAt ?? null,
    rawExcerpt: fx.excerpt ?? null,
  })
}
