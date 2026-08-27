'use client'

/**
 * The one data path behind /statistics/ownership and /statistics/shareholders.
 *
 * Both tables are monthly depository reports keyed on a company name rather
 * than a ticker, so every read here does three things the previous code did
 * not:
 *
 *   1. finds the latest period IN THE SOURCE and reads only that period. The
 *      old shareholders hook took `.limit(1000)` across all periods and then
 *      de-duplicated by company+holder, which silently presented a union of
 *      seven different months as one snapshot.
 *   2. pages until the period is exhausted. Both tables are past 1000 rows.
 *   3. resolves company names through `resolveSnapshot`, which either proves a
 *      ticker or leaves the row unresolved. Unresolved rows are counted in the
 *      coverage denominator and never shown against a company.
 */
import { useEffect, useState } from 'react'
import { buildRoster, resolveSnapshot, type Resolution, type RosterEntry } from '@/lib/depositoryNames'
import { fetchCompanyMeta } from '@/lib/market'

export interface Period { year: number; month: number }

export interface Coverage {
  /** Distinct company names the report printed for this period. */
  sourceCompanies: number
  /** Of those, the ones proven to be a company we can name. */
  matched: number
  /** Raw rows read for the period. */
  rows: number
}

export interface OwnRow {
  sym: string
  name: string
  iraqiShares: number
  foreignShares: number
  foreignHolders: number | null
  total: number
  foreignPct: number
}

export interface OwnershipSnapshot {
  period: Period | null
  rows: OwnRow[]
  coverage: Coverage
  /** Market totals, summed over EVERY row in the period — a sum needs no name. */
  market: { iraqi: number; foreign: number; foreignPct: number; foreignHolders: number; companies: number }
}

export interface HolderRow {
  id: string
  holder: string
  sym: string
  company: string
  pct: number
}

export interface ShareholdersSnapshot {
  period: Period | null
  rows: HolderRow[]
  coverage: Coverage
  /** Distinct nationality values the SOURCE recorded — not a claim about the holders. */
  nationalities: string[]
  companies: number
}

type State<T> = { data: T | null; loading: boolean; failed: boolean }

async function client() {
  const { createClient } = await import('@/lib/supabase/client')
  return createClient()
}

/** Every row of one period, not the first page. */
async function readPeriod(db: any, table: string, select: string, p: Period): Promise<any[]> {
  const out: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from(table).select(select)
      .eq('year', p.year).eq('month', p.month).range(from, from + 999)
    const page: any[] = data ?? []
    out.push(...page)
    if (page.length < 1000) return out
  }
}

async function latestPeriod(db: any, table: string): Promise<Period | null> {
  const { data } = await db.from(table).select('year,month')
    .order('year', { ascending: false }).order('month', { ascending: false }).limit(1)
  const row = data?.[0]
  return row?.year && row?.month ? { year: row.year, month: row.month } : null
}

/** The roster both pages match against. Curated names display; metrics names only match. */
async function roster(db: any): Promise<RosterEntry[]> {
  const [curated, metrics] = await Promise.all([
    fetchCompanyMeta().catch(() => []),
    db.from('company_metrics').select('ticker,name_ar,name_en').then((r: any) => r.data ?? []),
  ])
  return buildRoster(curated as any, metrics)
}

/** Prefer the reader's language, but never machine-translate a legal company name. */
function displayName(r: Resolution, entry: RosterEntry | undefined, locale: 'ar' | 'en'): string {
  const en = entry?.en, ar = r.canonical ?? entry?.ar
  return (locale === 'en' ? en || ar : ar || en) || r.sym!
}

export function useOwnership(locale: 'ar' | 'en'): State<OwnershipSnapshot> {
  const [s, set] = useState<State<OwnershipSnapshot>>({ data: null, loading: true, failed: false })
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const db = await client()
        const period = await latestPeriod(db, 'ownership_monthly')
        if (!period) { if (live) set({ data: null, loading: false, failed: true }); return }
        const [raw, list] = await Promise.all([
          readPeriod(db, 'ownership_monthly', 'name_ar,iraqi_shares,foreign_shares,iraqi_count,foreign_count', period),
          roster(db),
        ])
        const byS = new Map(list.map(r => [r.sym, r]))
        const res = resolveSnapshot(raw.map(r => r.name_ar), list)

        let iraqi = 0, foreign = 0, foreignHolders = 0
        const rows: OwnRow[] = []
        for (const r of raw) {
          const i = r.iraqi_shares ?? 0, f = r.foreign_shares ?? 0
          iraqi += i; foreign += f; foreignHolders += r.foreign_count ?? 0
          const hit = res.get(r.name_ar)
          if (!hit?.sym || f <= 0) continue
          rows.push({
            sym: hit.sym, name: displayName(hit, byS.get(hit.sym), locale),
            iraqiShares: i, foreignShares: f, foreignHolders: r.foreign_count ?? null,
            total: i + f, foreignPct: i + f ? (f / (i + f)) * 100 : 0,
          })
        }
        const names = Array.from(res.values())
        if (live) set({
          loading: false, failed: false,
          data: {
            period, rows,
            coverage: { sourceCompanies: names.length, matched: names.filter(r => r.sym).length, rows: raw.length },
            market: { iraqi, foreign, foreignPct: iraqi + foreign ? (foreign / (iraqi + foreign)) * 100 : 0, foreignHolders, companies: raw.length },
          },
        })
      } catch { if (live) set({ data: null, loading: false, failed: true }) }
    })()
    return () => { live = false }
  }, [locale])
  return s
}

export function useShareholders(locale: 'ar' | 'en'): State<ShareholdersSnapshot> {
  const [s, set] = useState<State<ShareholdersSnapshot>>({ data: null, loading: true, failed: false })
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const db = await client()
        const period = await latestPeriod(db, 'major_shareholders')
        if (!period) { if (live) set({ data: null, loading: false, failed: true }); return }
        const [raw, list] = await Promise.all([
          readPeriod(db, 'major_shareholders', 'company_name_ar,rank,name_ar,nationality,curr_pct', period),
          roster(db),
        ])
        const byS = new Map(list.map(r => [r.sym, r]))
        const res = resolveSnapshot(raw.map(r => r.company_name_ar), list)

        const rows: HolderRow[] = []
        for (const r of raw) {
          const hit = res.get(r.company_name_ar)
          /* The holder's own name is never matched or translated — it is a
             person or a legal entity, and the report's spelling is the only
             record of it there is. */
          if (!hit?.sym || r.curr_pct == null || !r.name_ar) continue
          rows.push({
            id: `${hit.sym}·${r.rank}·${r.name_ar}`, holder: r.name_ar, sym: hit.sym,
            company: displayName(hit, byS.get(hit.sym), locale), pct: r.curr_pct,
          })
        }
        const names = Array.from(res.values())
        if (live) set({
          loading: false, failed: false,
          data: {
            period, rows,
            coverage: { sourceCompanies: names.length, matched: names.filter(r => r.sym).length, rows: raw.length },
            nationalities: Array.from(new Set(raw.map(r => r.nationality).filter(Boolean))) as string[],
            companies: new Set(rows.map(r => r.sym)).size,
          },
        })
      } catch { if (live) set({ data: null, loading: false, failed: true }) }
    })()
    return () => { live = false }
  }, [locale])
  return s
}
