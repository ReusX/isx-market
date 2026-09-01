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

/**
 * Plain PostgREST rather than the Supabase client.
 *
 * `createAdminClient()` builds a `@supabase/ssr` client, which carries the
 * Realtime transport. On Node 20 that throws "Node.js 20 detected without
 * native WebSocket support" — so every write from the GitHub Action failed
 * while the job still exited 0. This layer needs one authenticated POST; a
 * `fetch` has no runtime coupling to argue with, and it is how the rest of the
 * server-side data layer already talks to the database (lib/freshness.ts,
 * lib/fxHistory.ts).
 */
const REST = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } }
}

let sourceIds: Map<string, number> | null = null

async function sourceIdMap(): Promise<Map<string, number>> {
  if (sourceIds) return sourceIds
  const r = REST()
  if (!r) return new Map()
  const res = await fetch(`${r.url}/rest/v1/data_sources?select=id,key`, { headers: r.headers })
  if (!res.ok) return new Map()
  const rows = (await res.json()) as { id: number; key: string }[]
  sourceIds = new Map(rows.map((x) => [x.key, x.id]))
  return sourceIds
}

/** POST rows with ON CONFLICT DO NOTHING on the dedupe key. */
async function insert(payload: Record<string, unknown>[]): Promise<{ ok: boolean; created: number; reason?: string }> {
  const r = REST()
  if (!r) return { ok: false, created: 0, reason: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set' }
  const res = await fetch(`${r.url}/rest/v1/fx_observations?on_conflict=dedupe_key`, {
    method: 'POST',
    headers: { ...r.headers, Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) return { ok: false, created: 0, reason: `${res.status} ${(await res.text()).slice(0, 160)}` }
  /* `ignore-duplicates` returns the inserted rows and nothing for conflicts,
     which is reliable for a single row. Bulk callers count the table instead —
     see recordMany. */
  const body = (await res.json().catch(() => [])) as unknown[]
  return { ok: true, created: Array.isArray(body) ? body.length : 0 }
}

function payloadOf(o: FxObservation, sid: number) {
  return {
    series: o.series, location: o.location, buy: o.buy, sell: o.sell,
    observed_at: o.observedAt, observed_date: o.observedDate, origin: o.origin,
    source_id: sid, source_url: o.sourceUrl ?? null, source_event: o.sourceEvent,
    source_ts: o.sourceTs ?? null, raw_excerpt: o.rawExcerpt ?? null,
    content_hash: o.rawExcerpt ? fingerprint(o.rawExcerpt) : null,
  }
}

/**
 * Append one observation. Returns whether a row was actually created.
 *
 * Failure is deliberately soft: recording is an enhancement to serving a rate,
 * and a page that renders the correct number must not 500 because the archive
 * write failed. The caller logs the reason.
 */
export async function record(obs: FxObservation): Promise<RecordResult> {
  try {
    const sid = (await sourceIdMap()).get(obs.sourceKey)
    if (!sid) return { outcome: 'error', inserted: false, reason: `unknown source '${obs.sourceKey}'` }
    const r = await insert([payloadOf(obs, sid)])
    if (!r.ok) return { outcome: 'error', inserted: false, reason: r.reason }
    const inserted = r.created > 0
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
  const ids = await sourceIdMap()
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk)
    const payload: Record<string, unknown>[] = []
    let bad = false
    for (const o of slice) {
      const sid = ids.get(o.sourceKey)
      if (!sid) { bad = true; break }
      payload.push(payloadOf(o, sid))
    }
    if (bad) {
      out.failed += slice.length
      if (!out.reasons.includes('unknown source key in batch')) out.reasons.push('unknown source key in batch')
      continue
    }
    const r = await insert(payload)
    if (!r.ok) {
      out.failed += slice.length
      if (r.reason && !out.reasons.includes(r.reason)) out.reasons.push(r.reason)
      continue
    }
    out.attempted += slice.length
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
