'use client'

import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { fetchCompanyMeta } from '@/lib/market'
import { DataTable, type TableColumn } from '@/components/design/DataTable'
import { CompanyIdentity } from '@/components/design/CompanyIdentity'
import { Range52Indicator, range52Position } from '@/components/design/Range52Indicator'
import { SectorChip } from '@/components/design/SectorChip'
import { ChangeValue } from '@/components/design/ui'
import { changeToneStyle } from '@/components/design/magnitude'
import type { CompanyMeta } from '@/types'

// ── types ────────────────────────────────────────────────────────────────────
type Metric = {
  ticker: string; sector: string; name_en: string | null; name_ar: string | null
  last_date: string | null
  last_close: number; prev_close: number | null
  close_1w: number | null; close_1m: number | null; close_3m: number | null
  close_yend: number | null; close_52w: number | null
  high_52w: number | null; low_52w: number | null
  avg_value_20d: number | null; days_since_trade: number | null; ff_net_30d: number | null
}
type Row = Metric & { name: string; logo?: string; color?: string; mcap?: number; pe?: number | null }

// A quote older than this (no trades) is treated as suspended/delisted and
// hidden by default · its "price" and period % would be misleading otherwise.
const STALE_DAYS = 60

// ── period config: which "as-of" close drives the % column ──────────────────
const PERIODS = [
  { id: '1d',  label: 'يوم',    },
  { id: '1w',  label: 'أسبوع',  },
  { id: '1m',  label: 'شهر',    },
  { id: '3m',  label: '٣ أشهر', },
  { id: 'ytd', label: 'العام',  },
  { id: '52w', label: 'سنة',    },
] as const
type PeriodId = typeof PERIODS[number]['id']

const SECTOR_AR: Record<string, string> = {
  Banks: 'بنوك', Industry: 'صناعة', Services: 'خدمات', Tourism: 'سياحة وفنادق',
  Investment: 'استثمار', Insurance: 'تأمين', Telecom: 'اتصالات', Agriculture: 'زراعة',
  'Money Transfer': 'تحويل مالي', Other: 'أخرى',
}

const PRESETS = [
  { id: 'all',     label: 'الكل' },
  { id: 'gainers', label: 'الرابحون' },
  { id: 'losers',  label: 'الخاسرون' },
  { id: 'liquid',  label: 'الأكثر سيولة' },
  { id: 'cheap',   label: 'الأرخص (مكرر)' },
  { id: 'fbuy',    label: 'شراء أجنبي' },
  { id: 'fsell',   label: 'بيع أجنبي' },
  { id: 'nearhi',  label: 'قرب القمة' },
] as const
type PresetId = typeof PRESETS[number]['id']

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const priceFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 })

// ── helpers ──────────────────────────────────────────────────────────────────
function pctFor(r: Row, p: PeriodId): number | null {
  const ref = ({ '1d': r.prev_close, '1w': r.close_1w, '1m': r.close_1m, '3m': r.close_3m, ytd: r.close_yend, '52w': r.close_52w } as const)[p]
  if (!ref) return null
  return ((r.last_close - ref) / ref) * 100
}

// compact IQD for the value columns (millions/billions)
function fmtIQDc(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(2) + ' مليار'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + ' مليون'
  if (v >= 1e3) return (v / 1e3).toFixed(0) + ' ألف'
  return Math.round(v).toString()
}

function fmtMcapIQD(m?: number): string {
  if (!m) return '·'
  // `mcap` is carried in millions of IQD.
  if (m >= 1e6) return (m / 1e6).toFixed(2) + 'T IQD'
  if (m >= 1e3) return (m / 1e3).toFixed(1) + 'B IQD'
  return m.toFixed(0) + 'M IQD'
}

// YYYY-MM-DD → DD/MM/YYYY (last-trade hint)
function fmtDate(d: string): string {
  const [y, m, day] = d.split('-')
  return day && m && y ? `${day}/${m}/${y}` : d
}

function ForeignFlowValue({ value }: { value: number | null }) {
  if (!value) return <span className="muted-cell">·</span>
  const tone = value > 0 ? 'positive' : 'negative'
  return (
    <bdi className={`change-value ${tone}`} style={changeToneStyle(value / 1e9) as CSSProperties}>
      {value > 0 ? '+' : '−'}{fmtIQDc(Math.abs(value))}
    </bdi>
  )
}

export default function ScreenerPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sector, setSector] = useState('all')
  const [period, setPeriod] = useState<PeriodId>('1m')
  const [preset, setPreset] = useState<PresetId>('all')
  const [showStale, setShowStale] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const [{ data }, meta] = await Promise.all([
          sb.from('company_metrics').select('*'),
          fetchCompanyMeta().catch(() => [] as CompanyMeta[]),
        ])
        const metaBy = new Map(meta.map(m => [m.sym, m]))
        const merged: Row[] = ((data ?? []) as Metric[]).map(m => {
          const meta = metaBy.get(m.ticker)
          // Market cap consistent with the displayed price: price × shares.
          // Falls back to the static figure only when share count is unknown.
          const mcap = (m.last_close > 0 && meta?.shares)
            ? (m.last_close * meta.shares) / 1_000_000
            : meta?.mcap
          return { ...m, name: meta?.ar || m.name_ar || m.name_en || m.ticker, logo: meta?.logo, color: meta?.color, mcap }
        })
        setRows(merged)

        // TTM P/E (Yahoo-style) for every ticker that has enough financials.
        try {
          const { fetchTtmPe } = await import('@/lib/fundamentals')
          const prices: Record<string, number> = {}
          for (const r of merged) if (r.last_close > 0) prices[r.ticker] = r.last_close
          const pe = await fetchTtmPe(sb, prices)
          setRows(prev => prev.map(r => ({ ...r, pe: pe[r.ticker]?.pe ?? null })))
        } catch { /* P/E is best-effort; screener still works without it */ }
      } finally { setLoading(false) }
    })()
  }, [])

  const sectors = useMemo(() => ['all', ...Array.from(new Set(rows.map(r => r.sector))).sort()], [rows])

  // count of suspended rows (hidden by default) for the toggle label
  const staleCount = useMemo(
    () => rows.filter(r => (r.days_since_trade ?? 0) > STALE_DAYS).length,
    [rows],
  )
  const activeCount = rows.length ? rows.length - staleCount : 0

  const view = useMemo(() => {
    let list = rows.slice()
    if (!showStale) list = list.filter(r => (r.days_since_trade ?? 0) <= STALE_DAYS)
    if (q.trim()) {
      const k = q.trim().toLowerCase()
      list = list.filter(r =>
        r.ticker.toLowerCase().includes(k) ||
        r.name.toLowerCase().includes(k) ||
        (r.name_en ?? '').toLowerCase().includes(k))
    }
    if (sector !== 'all') list = list.filter(r => r.sector === sector)
    if (preset === 'gainers') list = list.filter(r => (pctFor(r, period) ?? 0) > 0)
    else if (preset === 'losers') list = list.filter(r => (pctFor(r, period) ?? 0) < 0)
    else if (preset === 'liquid') list = list.filter(r => (r.avg_value_20d ?? 0) > 0)
    else if (preset === 'cheap')  list = list.filter(r => r.pe != null && r.pe > 0)
    else if (preset === 'fbuy')   list = list.filter(r => (r.ff_net_30d ?? 0) > 0)
    else if (preset === 'fsell')  list = list.filter(r => (r.ff_net_30d ?? 0) < 0)
    else if (preset === 'nearhi') list = list.filter(r => r.high_52w && (r.high_52w - r.last_close) / r.high_52w <= 0.05)
    return list
  }, [rows, q, sector, preset, period, showStale])

  const columns = useMemo<TableColumn<Row>[]>(() => [
    {
      key: 'company',
      label: 'الشركة',
      className: 'screener-company',
      linked: true,
      sortValue: r => r.name,
      render: r => <CompanyIdentity name={r.name} symbol={r.ticker} logo={r.logo} color={r.color} />,
    },
    {
      key: 'price',
      label: 'السعر',
      className: 'numeric-column',
      sortValue: r => r.last_close,
      render: r => (
        <span className="stacked-cell">
          <bdi>{priceFormat.format(r.last_close)}</bdi>
          {(r.days_since_trade ?? 0) > 5 && r.last_date ? <small>آخر تداول {fmtDate(r.last_date)}</small> : null}
        </span>
      ),
    },
    {
      key: 'change',
      label: `التغيّر · ${PERIODS.find(p => p.id === period)!.label}`,
      className: 'numeric-column',
      sortValue: r => pctFor(r, period) ?? Number.NEGATIVE_INFINITY,
      render: r => {
        const p = pctFor(r, period)
        return p == null ? <span className="muted-cell">·</span> : <ChangeValue value={p} />
      },
    },
    {
      key: 'pe',
      label: 'مكرر',
      className: 'numeric-column',
      sortValue: r => (r.pe != null && r.pe > 0 ? r.pe : Number.POSITIVE_INFINITY),
      render: r => (r.pe != null && r.pe > 0
        ? <bdi>{r.pe >= 100 ? Math.round(r.pe) : r.pe.toFixed(1)}</bdi>
        : <span className="muted-cell">·</span>),
    },
    {
      key: 'range',
      label: '٥٢ أسبوع',
      sortValue: r => (r.high_52w && r.low_52w ? range52Position(r.last_close, r.low_52w, r.high_52w) : -1),
      render: r => (r.high_52w && r.low_52w && r.high_52w !== r.low_52w
        ? <Range52Indicator price={r.last_close} low={r.low_52w} high={r.high_52w} />
        : <span className="muted-cell">·</span>),
    },
    {
      key: 'liquidity',
      label: 'السيولة',
      className: 'numeric-column',
      sortValue: r => r.avg_value_20d ?? -1,
      render: r => (r.avg_value_20d ? <bdi>{fmtIQDc(r.avg_value_20d)}</bdi> : <span className="muted-cell">·</span>),
    },
    {
      key: 'foreign',
      label: 'أجانب (٣٠ي)',
      className: 'numeric-column',
      sortValue: r => r.ff_net_30d ?? 0,
      render: r => <ForeignFlowValue value={r.ff_net_30d} />,
    },
    {
      key: 'marketCap',
      label: 'القيمة السوقية',
      className: 'numeric-column',
      sortValue: r => r.mcap ?? -1,
      render: r => <bdi>{fmtMcapIQD(r.mcap)}</bdi>,
    },
    {
      key: 'sector',
      label: 'القطاع',
      sortValue: r => SECTOR_AR[r.sector] ?? r.sector,
      render: r => SECTOR_AR[r.sector] ?? r.sector,
    },
  ], [period])

  // Two presets imply their own ordering; everything else opens on market cap.
  const initialSort = preset === 'liquid'
    ? { key: 'liquidity', direction: 'desc' as const }
    : preset === 'cheap'
      ? { key: 'pe', direction: 'asc' as const }
      : { key: 'marketCap', direction: 'desc' as const }

  return (
    <main className="terminal-shell app-page screener-page">
      <header className="screener-heading">
        <h1>فارز الأسهم</h1>
        <p>
          فلترة وترتيب أسهم السوق حسب الأداء والسيولة والمكرر وتدفق الأجانب
          {activeCount ? <> · <bdi>{activeCount}</bdi> شركة نشطة</> : null}
        </p>
      </header>

      <section className="screener-controls" aria-label="خيارات فارز الأسهم">
        <div className="screener-search-row">
          <label className="app-field screener-search" aria-label="بحث باسم الشركة أو الرمز">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث باسم أو رمز…" dir="auto" />
          </label>
          <div className="screener-chip-row" aria-label="الفلاتر السريعة">
            {PRESETS.map(item => (
              <SectorChip key={item.id} label={item.label} selected={preset === item.id} onClick={() => setPreset(item.id)} />
            ))}
          </div>
        </div>

        <div className="screener-inline-filters">
          <div className="screener-filter-group">
            <span>الفترة</span>
            <div className="screener-chip-row">
              {PERIODS.map(item => (
                <SectorChip key={item.id} label={item.label} selected={period === item.id} onClick={() => setPeriod(item.id)} />
              ))}
            </div>
          </div>
          <div className="screener-filter-group">
            <span>القطاع</span>
            <div className="screener-chip-row">
              {sectors.map(item => (
                <SectorChip
                  key={item}
                  label={item === 'all' ? 'كل القطاعات' : (SECTOR_AR[item] ?? item)}
                  selected={sector === item}
                  selectionTone="neutral"
                  onClick={() => setSector(item)}
                />
              ))}
            </div>
          </div>
        </div>

        {staleCount > 0 ? (
          <label className="delisted-checkbox">
            <input type="checkbox" checked={showStale} onChange={e => setShowStale(e.target.checked)} />
            <span>عرض الأسهم المتوقفة عن التداول (<bdi>{staleCount}</bdi>) · آخر تداول لها قبل أكثر من <bdi>{STALE_DAYS}</bdi> يوماً</span>
          </label>
        ) : null}
      </section>

      <section className="screener-results" aria-labelledby="screener-results-title">
        <h2 className="sr-only" id="screener-results-title">نتائج فارز الأسهم</h2>
        <DataTable
          // Remount when the preset changes so its implied ordering applies.
          key={preset}
          rows={view}
          columns={columns}
          loading={loading}
          rowKey={r => r.ticker}
          rowHref={r => `/c/${r.ticker}`}
          gridTemplateColumns="minmax(180px, 1.3fr) 84px 96px 58px 120px 100px 120px 115px 100px"
          minWidth="1010px"
          initialSort={initialSort}
          emptyTitle="لا توجد نتائج مطابقة"
          emptyDescription="جرّب تعديل الفلاتر أو مسح البحث."
        />
      </section>

      <p className="page-footnote">
        الأسعار من آخر نشرة تداول رسمية لكل سهم · القيمة السوقية = السعر × الأسهم المصدرة ·
        المكرر (P/E) محسوب على آخر ١٢ شهراً (TTM) ويظهر فقط للشركات التي توفّرت بياناتها المالية
      </p>
    </main>
  )
}
