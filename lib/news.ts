import { AR_MONTHS } from '@/lib/date'
/**
 * أخبار السوق — the model behind /news.
 *
 * Ported from `/Users/amed/iqwealth-design/app/news/newsData.ts`. The item
 * shape, the filter semantics and the grouping are the reference's own. Three
 * things differ, all because of what the real sources do and do not hold.
 *
 * ── One approved type has no source ───────────────────────────────────────
 * The reference feed carries three kinds: filings, capital actions, and
 * editorial. There is no capital-actions table in this database — not empty,
 * absent — so that kind is omitted rather than proxied from anything else.
 * Recorded in docs/TRANSPLANT_INVENTORY.md; nothing on the page claims it.
 *
 * ── The filing timestamp is `source_added_date`, not `published_at` ───────
 * `published_at` looks like the obvious field and is the wrong one. Across all
 * 281 public rows it spans 2026-06-18 to 2026-06-26 — an eight-day window that
 * is when the extraction pipeline ran, not when anything was disclosed — and
 * it is null on 5 of them. `source_added_date` is the Iraq Securities
 * Commission's own timestamp on the document, is non-null on all 281, and
 * spans 2021-08-31 to 2026-06-21. The feed orders and stamps by that.
 *
 * ── A filing has no headline, so one is composed from real fields ─────────
 * The source gives `ticker`, `fiscal_year`, `period` and `pdf_url`. The row's
 * headline is the period and year written out; nothing about the filing's
 * contents is claimed, because nothing about its contents is known here.
 * `template` (bank | industrial) is an internal parsing hint and is not shown.
 */

/* ── Types ────────────────────────────────────────────────────────────────
   Two, because the product genuinely has two. */
export const KINDS = [
  { id: 'all', label: 'الكل' },
  { id: 'filing', label: 'إفصاحات', source: 'هيئة الأوراق المالية' },
  { id: 'article', label: 'أخبار', source: 'تحرير IQWealth' },
] as const
export type KindId = (typeof KINDS)[number]['id']
export type ItemKind = Exclude<KindId, 'all'>

export type NewsItem = {
  id: string
  kind: ItemKind
  /** ISO timestamp. Filings carry ISC's own `source_added_date`. */
  at: string
  headline: string
  /** Present only where the source genuinely gives one. */
  excerpt: string | null
  /** The company an item is about — null for market-wide items. */
  symbol: string | null
  name: string | null
  sector: string | null
  source: string
  /** Filings only: the document behind the headline. */
  doc: { type: string; period: string; year: number } | null
  /** Where the row goes. Filings open a PDF; articles open a page here. */
  href: string
  external: boolean
}

export const kindMeta = (k: ItemKind) => KINDS.find(x => x.id === k)!

export const PERIOD_LABEL: Record<string, string> = {
  Q1: 'الربع الأول', Q2: 'الربع الثاني', Q3: 'الربع الثالث', Q4: 'الربع الرابع',
  ANNUAL: 'البيانات السنوية',
}

/* ── Time ─────────────────────────────────────────────────────────────────
   Exact stamps only. The reference prints «اليوم» / «أمس» against a fixed mock
   session date; here every day header carries its real date, and the clock is
   Baghdad's — the ISC timestamps arrive as UTC and reading them as UTC would
   move an afternoon filing back three hours. */


/** Baghdad is UTC+3 all year — Iraq has observed no DST since 2015. */
const BAGHDAD_OFFSET_MS = 3 * 3_600_000
const inBaghdad = (iso: string) => new Date(new Date(iso).getTime() + BAGHDAD_OFFSET_MS)

/** The calendar day an instant falls on in Baghdad, as `YYYY-MM-DD`. */
export const dayKey = (iso: string) => inBaghdad(iso).toISOString().slice(0, 10)

export function dayLabel(iso: string): string {
  const d = inBaghdad(iso)
  return `${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth() + 1]} ${d.getUTCFullYear()}`
}

export const timeLabel = (iso: string) => {
  const d = inBaghdad(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

export type DayGroup = { day: string; label: string; items: NewsItem[] }

export function groupByDay(items: NewsItem[]): DayGroup[] {
  const out: DayGroup[] = []
  for (const it of items) {
    const day = dayKey(it.at)
    const last = out[out.length - 1]
    if (last && last.day === day) last.items.push(it)
    else out.push({ day, label: dayLabel(it.at), items: [it] })
  }
  return out
}

/* ── Filtering ────────────────────────────────────────────────────────────
   Type, sector and a text query. Deliberately not a screener: no price, no
   ratio, no performance. */
export function filterNews(
  items: NewsItem[],
  { kind, sector, query }: { kind: KindId; sector: string; query: string },
): NewsItem[] {
  const q = query.trim().toLowerCase()
  return items.filter(it => {
    if (kind !== 'all' && it.kind !== kind) return false
    // A market-wide item has no sector, so a sector filter must exclude it —
    // silently keeping it would misreport what the filter means.
    if (sector !== 'ALL' && it.sector !== sector) return false
    if (!q) return true
    return (
      it.headline.toLowerCase().includes(q) ||
      (it.name?.toLowerCase().includes(q) ?? false) ||
      (it.symbol?.toLowerCase().includes(q) ?? false) ||
      it.source.toLowerCase().includes(q) ||
      (it.excerpt?.toLowerCase().includes(q) ?? false)
    )
  })
}

export const countByKind = (items: NewsItem[], kind: KindId) =>
  kind === 'all' ? items.length : items.filter(i => i.kind === kind).length
