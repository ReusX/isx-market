'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { useLocale } from '@/context/LocaleContext'
import type { Messages } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/locale'
import { fetchCompanyMeta } from '@/lib/market'
import { CompanyLogo } from '@/components/CompanyLogo'
import { useOverlay } from '@/components/system/Overlay'
import { arDate } from '@/lib/date'
import {
  METRICS, GROUPS, PERIODS, PRESETS, STALE_DAYS,
  activePreset, bandPosition, inRange, metricDef, metricValue, periodChange,
  presetRanges, rangeInvalid, rangeIsSet, sectorLabel, toRow,
  type Metric, type MetricId, type PeriodId, type PresetId, type Range, type Ranges, type ScreenerRow,
} from '@/lib/screener'
import type { CompanyMeta } from '@/types'
import '@/styles/screener.css'

/* ═══════════════════════════════════════════════════════════════════════════
   فارز الأسهم — THE SCREENER.

   A VISUAL RE-PORT of the approved reference route
   (`/Users/amed/iqwealth-design/app/screener/ScreenerWorkspace.tsx` and the
   «فارز الأسهم» block of its globals.css), wired to this application's real
   data. `docs/SCREENER_DATA_MAP.md` is the audit behind every field used.

   ── The job ───────────────────────────────────────────────────────────────
   Find the listed companies matching a specific condition, fast. Not «browse
   the market» — حركة السوق already does that and does it better. Someone opens
   this page with a sentence already in their head: cheap banks with real
   liquidity, whatever foreigners have been buying, what is near its high. The
   page's job is to get that sentence expressed and answered.

   ── Why it is not shaped like the board ───────────────────────────────────
   Same table, same numerals, same Electric Blue — but the board is a page you
   READ and this is a page you OPERATE. The board leads with a session summary
   because the session is its subject. Here the subject is the question, so the
   instrument comes first and there is no summary strip at all: totals across
   an arbitrary filtered subset are not a fact about anything.

   ── The two decisions that changed from what ships today ──────────────────
   1. PRESETS WRITE THEIR CONDITION instead of entering a mode. Today pressing
      «الأقل مكرراً» filters to `pe > 0` and you cannot see that, adjust it, or
      combine it with anything. Now it leaves a visible, editable «مكرر الربحية
      0.1 – 10» token. Same eight shortcuts, no longer a dead end.
   2. FILTERS HIDE UNTIL WANTED; ACTIVE FILTERS NEVER HIDE. Seven metrics x two
      bounds is fourteen inputs, and a wall of empty number fields is not
      power, it is homework. But anything narrowing the results is always on
      screen as a token — nobody should wonder why only six companies show.
   ═══════════════════════════════════════════════════════════════════════════ */

type Listing = 'active' | 'suspended'
type SortKey = MetricId | 'company'

const EMPTY: Range = { min: null, max: null }

const nfInt = new Intl.NumberFormat('en-US')
const nfPrice = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Compact IQD. Latin magnitudes, not ألف/مليون — the Arabic word lands on the
 *  wrong side of a signed number under bidi («مليون 11.4-»). */
function iqd(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T'
  if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B'
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (a >= 1e3) return (v / 1e3).toFixed(0) + 'K'
  return Math.round(v).toString()
}

/** Round first, then take the sign from what the reader will actually see. */
function signedPct(v: number): { text: string; cls: string } {
  const r = Number(v.toFixed(2))
  return { text: `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toFixed(2)}%`, cls: r > 0 ? 'positive' : r < 0 ? 'negative' : 'neutral' }
}

export function Screener() {
  const { t, locale, href: L } = useLocale()
  const sc = t.screener
  const ar = locale === 'ar'

  const [metrics, setMetrics] = useState<Metric[]>([])
  const [meta, setMeta] = useState<Map<string, CompanyMeta>>(new Map())
  const [pe, setPe] = useState<Record<string, number>>({})
  const [peFailed, setPeFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const [query, setQuery] = useState('')
  const [sector, setSector] = useState('ALL')
  const [period, setPeriod] = useState<PeriodId>('1m')
  const [listing, setListing] = useState<Listing>('active')
  const [ranges, setRanges] = useState<Ranges>({})
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('mcap')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Seeded from ?q= · the endpoint the header search and the WebSite
  // SearchAction both point at.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setQuery(q)
  }, [])

  const load = useCallback(() => {
    setFailed(false)
    setLoading(true)
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const [{ data, error }, companyMeta] = await Promise.all([
          sb.from('company_metrics').select('*'),
          fetchCompanyMeta().catch(() => [] as CompanyMeta[]),
        ])
        if (error || !data) { setFailed(true); return }
        setMetrics(data as Metric[])
        setMeta(new Map(companyMeta.map((m) => [m.sym, m])))

        /* P/E is a SECOND request and is allowed to fail on its own. Losing it
           must not lose the other six metrics, so its failure is a partial
           notice rather than an error state. */
        try {
          const { fetchTtmPe } = await import('@/lib/fundamentals')
          const prices: Record<string, number> = {}
          for (const m of data as Metric[]) if (m.last_close > 0) prices[m.ticker] = m.last_close
          const res = await fetchTtmPe(sb, prices)
          setPe(Object.fromEntries(Object.entries(res).map(([t, v]) => [t, v.pe])))
        } catch { setPeFailed(true) }
      } catch { setFailed(true) } finally { setLoading(false) }
    })()
  }, [])

  useEffect(load, [load])

  const all = useMemo<ScreenerRow[]>(
    () => metrics.map((m) => {
      const row = toRow(m, meta.get(m.ticker), ar)
      return { ...row, pe: pe[m.ticker] ?? null }
    }),
    [metrics, meta, pe, ar],
  )

  const suspendedCount = useMemo(() => all.filter((r) => r.suspended).length, [all])
  const universe = all.length - suspendedCount

  const sectors = useMemo(
    () => ['ALL', ...Array.from(new Set(all.map((r) => r.sector))).sort()],
    [all],
  )

  const rows = useMemo(() => {
    let list = all.filter((r) => r.suspended === (listing === 'suspended'))
    if (sector !== 'ALL') list = list.filter((r) => r.sector === sector)

    const q = query.trim().toLowerCase()
    if (q) {
      /* `r.name` is the resolved, de-debris'd name (see `usableName` in
         lib/screener.ts). The raw `name_en` is still searched because the
         curated English name and the exchange's differ often enough to matter;
         the raw `name_ar` is NOT, because for 54 rows it is a bare number and
         a query of «5» would match a bank. */
      list = list.filter((r) =>
        r.ticker.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.name.includes(query.trim()) ||
        (r.name_en ?? '').toLowerCase().includes(q))
    }

    /* Every range composes with every other — a company must satisfy them all.
       `inRange` excludes an unmeasured value rather than admitting it, and a
       metric a company is missing never removes it from a filter about a
       different metric. */
    for (const [id, range] of Object.entries(ranges) as [MetricId, Range][]) {
      if (!rangeIsSet(range)) continue
      list = list.filter((r) => inRange(metricValue(r, id, period), range))
    }

    const factor = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      if (sortKey === 'company') return a.name.localeCompare(b.name, locale) * factor
      const av = metricValue(a, sortKey, period)
      const bv = metricValue(b, sortKey, period)
      // Unmeasured sinks, whichever way the column points.
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      return (av - bv) * factor
    })
  }, [all, listing, sector, query, ranges, period, sortKey, sortDir, ar])

  /* The count takes the brand colour for a beat when the number actually
     MOVES — not on every render, and not on a change that leaves it where it
     was. A filter that did something and one that did nothing looked
     identical before. */
  const [countChanged, setCountChanged] = useState(false)
  const prevCount = useRef(rows.length)
  useEffect(() => {
    if (prevCount.current === rows.length) return
    prevCount.current = rows.length
    setCountChanged(true)
    const id = setTimeout(() => setCountChanged(false), 520)
    return () => clearTimeout(id)
  }, [rows.length])

  function setRange(id: MetricId, next: Range) {
    setRanges((cur) => {
      const copy = { ...cur }
      if (next.min === null && next.max === null) delete copy[id]
      else copy[id] = next
      return copy
    })
  }

  function applyPreset(id: PresetId) {
    const next = presetRanges(id)
    if (next === null) { setRanges({}); setSortKey('mcap'); setSortDir('desc'); return }
    setRanges(next)
    const [k] = Object.keys(next) as MetricId[]
    setSortKey(k)
    setSortDir(id === 'losers' || id === 'fsell' || id === 'cheap' ? 'asc' : 'desc')
  }

  function sortBy(key: SortKey) {
    if (key === sortKey) { setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); return }
    setSortKey(key)
    setSortDir(key === 'company' || key === 'pe' ? 'asc' : 'desc')
  }

  function resetAll() {
    setRanges({}); setSector('ALL'); setQuery('')
    setSortKey('mcap'); setSortDir('desc')
  }

  const preset = activePreset(ranges)
  const setCount = Object.keys(ranges).length
  const activeCount = setCount + (sector !== 'ALL' ? 1 : 0) + (query.trim() ? 1 : 0)
  const invalid = (Object.keys(ranges) as MetricId[]).filter((id) => rangeInvalid(ranges[id]))
  const periodLabel = PERIODS.find((p) => p.id === period)![locale]
  const showEmpty = !loading && !failed && rows.length === 0

  const closeSheet = useCallback(() => setSheetOpen(false), [])
  const sheetRef = useOverlay(sheetOpen, closeSheet)

  /** «≥ 8» / «≤ 10» / «8 – 10», in the metric's own units. */
  function describe(id: MetricId, r: Range): string {
    const d = metricDef(id)
    const fmt = (n: number) =>
      id === 'liquidity' || id === 'mcap' || id === 'foreign' ? iqd(n)
      : id === 'change' || id === 'band' ? `${n}%`
      : String(n)
    const suffix = id === 'change' ? ` · ${periodLabel}` : ''
    void d
    if (r.min !== null && r.max !== null) return `${fmt(r.min)} – ${fmt(r.max)}${suffix}`
    if (r.min !== null) return `≥ ${fmt(r.min)}${suffix}`
    if (r.max !== null) return `≤ ${fmt(r.max)}${suffix}`
    return ''
  }

  const filterGroups = (
    <>
      {GROUPS.map((g) => (
        <div className="sc-group" key={g.id}>
          <h3>{g[locale]}</h3>
          <div className="sc-group-rows">
            {METRICS.filter((m) => m.group === g.id).map((m) => {
              const r = ranges[m.id] ?? EMPTY
              const on = rangeIsSet(r)
              const bad = rangeInvalid(r)
              const unit = locale === 'ar' ? m.unitAr : m.unitEn
              return (
                <div className="sc-row" key={m.id} data-active={on || undefined} data-invalid={bad || undefined}>
                  <span className="sc-row-label" id={`lbl-${m.id}`}>
                    {m[locale]}
                    {unit ? <em>{unit}</em> : null}
                  </span>
                  <div className="sc-inputs">
                    <NumberField value={r.min} scale={m.scale} step={m.step}
                      placeholder={sc.min}
                      label={sc.minOf(m[locale])}
                      onChange={(v) => setRange(m.id, { ...r, min: v })} />
                    <span className="sc-dash-sep" aria-hidden="true">—</span>
                    <NumberField value={r.max} scale={m.scale} step={m.step}
                      placeholder={sc.max}
                      label={sc.maxOf(m[locale])}
                      onChange={(v) => setRange(m.id, { ...r, max: v })} />
                    <button type="button" className="sc-row-clear" hidden={!on}
                      aria-label={sc.clearFilterOf(m[locale])}
                      onClick={() => setRange(m.id, EMPTY)}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <p className="sc-group-note">
        {ar
          ? <>الفلاتر تعمل معاً — على الشركة أن تحقق كل الشروط. الشركات التي لا يتوفر لها قياس معيّن تُستبعد من أي فلتر على ذلك القياس، وتبقى مشمولة بالفلاتر الأخرى · «التغيّر» يتبع الفترة المختارة أعلاه.</>
          : <>Filters compose — a company must satisfy all of them. A company with no value for a metric is excluded from filters on that metric, and stays eligible for every other one · «Change» follows the period selected above.</>}
      </p>
    </>
  )

  return (
    <main className="iq-page sc">
      <header className="sc-head">
        <div className="sc-head-title">
          <h1>{sc.title}</h1>
          <p>{sc.standfirst}</p>
        </div>
      </header>

      {/* ── The instrument ─────────────────────────────────────────────────── */}
      <section className="sc-workspace" aria-label={sc.workspace}>
        <div className="sc-bar">
          <label className="sc-search">
            <span aria-hidden="true" className="sc-search-icon">⌕</span>
            <span className="sr-only">{sc.searchLabel}</span>
            <input value={query} dir="auto"
              placeholder={sc.searchPlaceholder}
              onChange={(e) => setQuery(e.target.value)} />
            {query ? (
              <button type="button" className="sc-search-clear"
                aria-label={sc.clearSearch} onClick={() => setQuery('')}>✕</button>
            ) : null}
          </label>

          <label className="sc-sector">
            <span className="sr-only">{sc.sectorLabel}</span>
            <select value={sector} onChange={(e) => setSector(e.target.value)}>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? sc.allSectors : sectorLabel(s, locale)}
                </option>
              ))}
            </select>
            <i aria-hidden="true">▾</i>
          </label>

          {/* The period is not a filter — it redefines what «التغيّر» MEANS,
              for the column and any change filter at once. */}
          <div className="sc-period" role="group" aria-label={sc.periodLabel}>
            <span>{sc.changeOver}</span>
            <div className="sc-period-seg">
              {PERIODS.map((p) => (
                <button key={p.id} type="button" aria-pressed={period === p.id}
                  className={period === p.id ? 'active' : ''} onClick={() => setPeriod(p.id)}>
                  {p[locale]}
                </button>
              ))}
            </div>
          </div>

          <div className="sc-bar-end">
            <button type="button" className="sc-advanced-toggle"
              aria-expanded={advancedOpen} onClick={() => setAdvancedOpen((v) => !v)}>
              <span>{sc.advanced}</span>
              {setCount ? <b>{setCount}</b> : null}
              <i aria-hidden="true" data-open={advancedOpen || undefined}>▾</i>
            </button>
            <button type="button" className="sc-sheet-open" onClick={() => setSheetOpen(true)}>
              <span>{sc.filters}</span>
              {activeCount ? <b>{activeCount}</b> : null}
            </button>
          </div>
        </div>

        <div className="sc-presets" role="group" aria-label={sc.quickStarts}>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" title={locale === 'ar' ? p.hintAr : p.hintEn}
              aria-pressed={preset === p.id} className={preset === p.id ? 'active' : ''}
              onClick={() => applyPreset(p.id)}>{p[locale]}</button>
          ))}
        </div>

        {advancedOpen ? <div className="sc-advanced">{filterGroups}</div> : null}

        {/* Always on screen, panel open or not. This is the row that answers
            «why am I only seeing six companies». */}
        <div className="sc-active">
          <div className="sc-tokens">
            {sector !== 'ALL' ? (
              <Token label={sc.tokenSector} value={sectorLabel(sector, locale)}
                remove={sc.removeSector} onRemove={() => setSector('ALL')} />
            ) : null}
            {query.trim() ? (
              <Token label={sc.tokenSearch} value={query.trim()}
                remove={sc.removeSearch} onRemove={() => setQuery('')} />
            ) : null}
            {(Object.entries(ranges) as [MetricId, Range][]).map(([id, r]) => (
              <Token key={id} label={metricDef(id)[locale]} value={describe(id, r)}
                remove={sc.removeFilterOf(metricDef(id)[locale])}
                onRemove={() => setRange(id, EMPTY)} />
            ))}
            {activeCount === 0 ? (
              <span className="sc-no-filters">
                {sc.noFilters}
              </span>
            ) : null}
          </div>

          <div className="sc-active-end">
            {activeCount ? (
              <button type="button" className="sc-reset" onClick={resetAll}>
                {sc.reset}
              </button>
            ) : null}
            <p className="sc-count" aria-live="polite" data-changed={countChanged || undefined}>
              <strong><bdi>{rows.length}</bdi></strong>
              <span>
                {sc.matchingOf}{' '}
                <bdi>{listing === 'suspended' ? suspendedCount : universe}</bdi>
              </span>
            </p>
          </div>
        </div>

        {invalid.length ? (
          <p className="sc-invalid-note" role="status">
            {sc.invalidRange(invalid.map((id) => metricDef(id)[locale]).join(sc.listSeparator))}
          </p>
        ) : null}
      </section>

      <div className="sc-listing-row">
        <div className="sc-listing" role="group" aria-label={sc.listingLabel}>
          <button type="button" aria-pressed={listing === 'active'} onClick={() => setListing('active')}>
            {sc.active} <bdi>{universe}</bdi>
          </button>
          <button type="button" aria-pressed={listing === 'suspended'} onClick={() => setListing('suspended')}>
            {sc.suspended} <bdi>{suspendedCount}</bdi>
          </button>
        </div>
        {listing === 'suspended' ? (
          <p className="sc-note">
            {sc.suspendedNote(String(STALE_DAYS))}
          </p>
        ) : null}
      </div>

      {peFailed ? (
        <p className="sc-note sc-note-warn" role="status" style={{ marginBlockStart: 10 }}>
          <i aria-hidden="true">!</i>
          {sc.peFailed}
        </p>
      ) : null}

      {failed ? (
        <div className="sc-error" role="alert">
          <span className="sc-error-mark" aria-hidden="true">!</span>
          <div>
            <strong>{sc.loadFailedTitle}</strong>
            <p>{sc.loadFailedNote}</p>
          </div>
          <button type="button" onClick={load}>{sc.retry}</button>
        </div>
      ) : (
        <section className="sc-board" data-empty={showEmpty || undefined}
          aria-label={sc.resultsLabel}>
          <div className="sc-board-scroll">
            <table className="sc-table">
              <caption className="sr-only">
                {sc.caption(String(rows.length))}
              </caption>
              <thead>
                <tr>
                  <th className="sc-col-company" scope="col"
                    aria-sort={sortKey === 'company' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    <Sort label={sc.colCompany} k="company" {...{ sortKey, sortDir, sortBy, sc }} />
                  </th>
                  <Head k="price" label={sc.colPrice} {...{ sortKey, sortDir, sortBy, ranges, sc }} />
                  <Head k="change" label={`${sc.colChange} · ${periodLabel}`} {...{ sortKey, sortDir, sortBy, ranges, sc }} />
                  <Head k="pe" label={sc.colPe} {...{ sortKey, sortDir, sortBy, ranges, sc }} />
                  <Head k="band" label={sc.colBand} cls="sc-col-band" {...{ sortKey, sortDir, sortBy, ranges, sc }} />
                  <Head k="liquidity" label={sc.colLiquidity} {...{ sortKey, sortDir, sortBy, ranges, sc }} />
                  <Head k="foreign" label={sc.colForeign} {...{ sortKey, sortDir, sortBy, ranges, sc }} />
                  <Head k="mcap" label={sc.colMcap} {...{ sortKey, sortDir, sortBy, ranges, sc }} />
                  <th className="sc-col-sector" scope="col">{sc.colSector}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <SkeletonRows /> : null}
                {!loading && !showEmpty ? rows.map((r) => (
                  <ResultRow key={r.ticker} row={r} period={period} locale={locale} sc={sc} peFailed={peFailed} />
                )) : null}
              </tbody>
            </table>
          </div>

          {showEmpty ? (
            <div className="sc-empty">
              <strong>{sc.emptyTitle}</strong>
              <p>{sc.emptyNote}</p>
              <div className="sc-empty-filters">
                {sector !== 'ALL' ? <span>{sectorLabel(sector, locale)}</span> : null}
                {query.trim() ? <span>{sc.emptySearch}: {query.trim()}</span> : null}
                {(Object.entries(ranges) as [MetricId, Range][]).map(([id, r]) => (
                  <span key={id}>{metricDef(id)[locale]} {describe(id, r)}</span>
                ))}
              </div>
              <button type="button" onClick={resetAll}>{sc.emptyReset}</button>
            </div>
          ) : null}
        </section>
      )}

      <p className="sc-footnote">
        {sc.footnote}
      </p>

      {/* ── Mobile sheet ───────────────────────────────────────────────────
          A sheet rather than a crushed desktop bar. Filters apply live, so the
          count in its header updates while you work and the footer button can
          say what pressing it will show. Closing never discards a set. */}
      {sheetOpen ? (
        <>
          <div className="sc-scrim" onClick={closeSheet} aria-hidden="true" />
          <div className="sc-sheet" ref={sheetRef} role="dialog" aria-modal="true"
            aria-label={sc.filters} tabIndex={-1}>
            <header>
              <div>
                <strong>{sc.filters}</strong>
                <small><bdi>{rows.length}</bdi> {sc.sheetMatching}</small>
              </div>
              <button type="button" className="sc-sheet-close" onClick={closeSheet}
                aria-label={sc.sheetClose} data-autofocus>✕</button>
            </header>

            <div className="sc-sheet-body">
              <div className="sc-sheet-group">
                <h3>{sc.colSector}</h3>
                <label className="sc-sector">
                  <span className="sr-only">{sc.colSector}</span>
                  <select value={sector} onChange={(e) => setSector(e.target.value)}>
                    {sectors.map((s) => (
                      <option key={s} value={s}>
                        {s === 'ALL' ? sc.allSectors : sectorLabel(s, locale)}
                      </option>
                    ))}
                  </select>
                  <i aria-hidden="true">▾</i>
                </label>
              </div>

              <div className="sc-sheet-group">
                <h3>{sc.periodLabel}</h3>
                <div className="sc-period-seg">
                  {PERIODS.map((p) => (
                    <button key={p.id} type="button" aria-pressed={period === p.id}
                      className={period === p.id ? 'active' : ''} onClick={() => setPeriod(p.id)}>
                      {p[locale]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sc-sheet-group">
                <h3>{sc.quickStarts}</h3>
                <div className="sc-presets">
                  {PRESETS.map((p) => (
                    <button key={p.id} type="button" aria-pressed={preset === p.id}
                      className={preset === p.id ? 'active' : ''} onClick={() => applyPreset(p.id)}>
                      {p[locale]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sc-advanced">{filterGroups}</div>
            </div>

            <footer>
              <button type="button" className="sc-sheet-reset" onClick={resetAll}>
                {sc.reset}
              </button>
              {/* «Show N results», not «Apply» — the filters are already applied
                  and the count above proves it. This button closes. */}
              <button type="button" className="sc-sheet-apply" onClick={closeSheet}>
                {sc.show} <bdi>{rows.length}</bdi> {sc.results}
              </button>
            </footer>
          </div>
        </>
      ) : null}
    </main>
  )
}

/* Stays empty until it holds a real number — not zero. `0` is a legitimate
   bound (net foreign flow above 0) and an empty field is a different
   statement, so the two cannot share a representation. */
function NumberField({ value, onChange, placeholder, label, scale, step }: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder: string
  label: string
  scale: number
  step: number
}) {
  const shown = value === null ? '' : String(Number((value / scale).toFixed(4)))
  return (
    <input
      className="sc-number"
      type="number"
      inputMode="decimal"
      step={step}
      dir="ltr"
      aria-label={label}
      placeholder={placeholder}
      value={shown}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value) * scale)}
    />
  )
}

function Token({ label, value, remove, onRemove }: {
  label: string; value: string; remove: string; onRemove: () => void
}) {
  return (
    <span className="sc-token">
      <em>{label}</em>
      <bdi>{value}</bdi>
      <button type="button" onClick={onRemove} aria-label={remove}>✕</button>
    </span>
  )
}

/** A column carrying an active filter is marked, so the filter set and the
 *  results read as one object seen twice rather than two lists to reconcile. */
function Head({ k, label, cls = '', sortKey, sortDir, sortBy, ranges, sc }: {
  k: MetricId; label: string; cls?: string
  sortKey: SortKey; sortDir: 'asc' | 'desc'; sortBy: (k: SortKey) => void
  ranges: Ranges; sc: Messages['screener']
}) {
  return (
    <th scope="col" className={`sc-col-num ${cls}`}
      data-filtered={rangeIsSet(ranges[k]) ? 'true' : undefined}
      aria-sort={sortKey === k ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <Sort label={label} k={k} sortKey={sortKey} sortDir={sortDir} sortBy={sortBy} sc={sc} />
    </th>
  )
}

function Sort({ label, k, sortKey, sortDir, sortBy, sc }: {
  label: string; k: SortKey; sortKey: SortKey
  sortDir: 'asc' | 'desc'; sortBy: (k: SortKey) => void; sc: Messages['screener']
}) {
  const active = sortKey === k
  const state = active
    ? sortDir === 'asc' ? sc.sortedAsc : sc.sortedDesc
    : sc.notSorted
  return (
    <button type="button" onClick={() => sortBy(k)} className={active ? 'active' : ''}
      data-dir={active ? sortDir : undefined} aria-label={`${label} · ${state}`}>
      <span>{label}</span>
      <svg viewBox="0 0 9 6" width="9" height="6" aria-hidden="true" className="sc-caret">
        <path d="M0.6 0.8 L4.5 4.9 L8.4 0.8" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    </button>
  )
}

function Dash({ sc, why }: { sc: Messages['screener']; why?: string }) {
  return <span className="sc-dash" title={why} aria-label={why ?? sc.noMeasure}>—</span>
}

function ResultRow({ row, period, locale, sc, peFailed }: {
  row: ScreenerRow; period: PeriodId; locale: Locale; sc: Messages['screener']; peFailed: boolean
}) {
  const change = periodChange(row, period)
  const band = bandPosition(row)
  const quiet = row.suspended
  const ff = row.ff_net_30d

  return (
    <tr data-quiet={quiet || undefined}>
      <td className="sc-col-company">
        <Link href={`/c/${row.ticker}`}>
          <CompanyLogo className="sc-mark" sym={row.ticker} logo={row.logo} letters={2} />
          <span className="sc-identity">
            <strong title={row.name}>{row.name}</strong>
            <small>
              <bdi className="sc-ticker">{row.ticker}</bdi>
              <em>{sectorLabel(row.sector, locale)}</em>
            </small>
          </span>
        </Link>
      </td>

      <td className="sc-col-num sc-price">
        <bdi>{nfPrice.format(row.last_close)}</bdi>
        {/* NOT `bdi`-wrapped: an Arabic date isolated as LTR reorders. */}
        {quiet && row.last_date ? <small>{arDate(row.last_date)}</small> : null}
      </td>

      <td className="sc-col-num">
        {change === null
          ? <Dash sc={sc} why={sc.noReference} />
          : <bdi className={`sc-pct ${signedPct(change).cls}`}>{signedPct(change).text}</bdi>}
      </td>

      {/* P/E comes from a second, failure-tolerant request. Null is the normal
          case for two thirds of the exchange — either no published financials
          or a loss, and a loss has no meaningful multiple. Never 0. */}
      <td className="sc-col-num">
        {peFailed ? <span className="sc-unmeasured" title={sc.peLoadFailed}>⌁</span>
          : row.pe === null ? <Dash sc={sc} why={sc.peUnavailable} />
          : <bdi>{row.pe >= 100 ? Math.round(row.pe) : row.pe < 1 ? row.pe.toFixed(2) : row.pe.toFixed(1)}</bdi>}
      </td>

      <td className="sc-col-num sc-col-band">
        {band === null ? <Dash sc={sc} /> : (
          <span className="sc-band" title={`${nfPrice.format(row.low_52w!)} – ${nfPrice.format(row.high_52w!)}`}>
            <span className="sc-band-track"><i style={{ insetInlineStart: `${band}%` }} /></span>
            <bdi>{Math.round(band)}%</bdi>
          </span>
        )}
      </td>

      <td className="sc-col-num">
        {row.avg_value_20d === null ? <Dash sc={sc} /> : <bdi>{iqd(row.avg_value_20d)}</bdi>}
      </td>

      {/* ⚠ 0 IS A MEASURED NET, not a gap — 89 of 124 rows sit at exactly zero
          and 13 of those do appear in the foreign-flow table. It renders as a
          real zero; only a genuinely absent value gets the dash. */}
      <td className="sc-col-num">
        {ff === null ? <Dash sc={sc} /> : ff === 0 ? <bdi className="neutral">0</bdi> : (
          <bdi className={ff > 0 ? 'positive' : 'negative'}>
            {ff > 0 ? '+' : '−'}{iqd(Math.abs(ff))}
          </bdi>
        )}
      </td>

      <td className="sc-col-num">
        {row.suspended || row.mcap === null ? <Dash sc={sc} /> : <bdi>{iqd(row.mcap)}</bdi>}
      </td>

      <td className="sc-col-sector">{sectorLabel(row.sector, locale)}</td>
    </tr>
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => (
        <tr className="sc-skeleton" key={i} aria-hidden="true">
          <td className="sc-col-company">
            <span className="sc-skeleton-id">
              <i className="sc-skeleton-mark" />
              <span>
                <i style={{ inlineSize: `${54 + ((i * 13) % 40)}%` }} />
                <i style={{ inlineSize: '32%', blockSize: '8px' }} />
              </span>
            </span>
          </td>
          {Array.from({ length: 7 }, (_, c) => (
            <td className="sc-col-num" key={c}><i style={{ inlineSize: `${46 + ((i + c) % 4) * 11}%` }} /></td>
          ))}
          <td className="sc-col-sector"><i style={{ inlineSize: '54px' }} /></td>
        </tr>
      ))}
    </>
  )
}
