'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { useMarketData, usePortfolio, type Lot } from '@/lib/portfolio'
import { positions, totals, slices, type Position } from '@/lib/portfolioView'
import { sectorLabel } from '@/lib/screener'
import { iqd, nf0 } from '@/lib/statistics'
import TickerPicker from '@/components/TickerPicker'
import '@/styles/panels.css'
import '@/styles/portfolio.css'

/**
 * المحفظة — a direct port of the approved portfolio page.
 *
 * Everything else in the product describes a market; this describes one
 * person's money, and the difference is carried by context rather than by a
 * second visual language: the header says whose data it is, where it is
 * stored, and what it is priced from.
 *
 * The store is a list of buy lots, so the page shows exactly what that
 * supports — current value, cost, unrealised profit, allocation — and none of
 * what it does not: no realised profit, no ledger, no performance curve, no
 * cash balance, no benchmark. Signing in is optional, not a wall: the store is
 * localStorage first and syncs to `profiles.portfolio` when there is a session.
 *
 * Two corrections the approved design makes to the old page, both kept:
 * a missing price is not zero — the row is unvalued, excluded from the total,
 * and the total says how many it excluded — and the day change and carried-
 * price age, which sat unread in `company_metrics`, are shown.
 */

const FILTERS = [
  { id: 'all' as const },
  { id: 'up' as const },
  { id: 'down' as const },
] as const
type FilterId = (typeof FILTERS)[number]['id']
type SortId = 'value' | 'pl' | 'weight' | 'day'
type Draft = { id?: string; sym: string; qty: string; price: string; date: string; note: string }
const EMPTY_DRAFT: Draft = { sym: '', qty: '', price: '', date: '', note: '' }

const pct = (v: number | null) =>
  v == null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`
const signedIqd = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${iqd(Math.abs(v))}`

export function Portfolio() {
  const { t: T, locale, href: L } = useLocale()
  const pf = T.personal.portfolio
  const { user } = useApp()
  const { meta, metaBy, quotes, loading: pricesLoading } = useMarketData()
  const { lots, ready, addLot, removeLot, removeSym } = usePortfolio()

  const [sort, setSort] = useState<SortId>('value')
  const [dir, setDir] = useState<'desc' | 'asc'>('desc')
  const [filter, setFilter] = useState<FilterId>('all')
  const [query, setQuery] = useState('')
  const [openLots, setOpenLots] = useState<string | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [sheet, setSheet] = useState<Draft | null>(null)
  const [confirm, setConfirm] = useState<Position | null>(null)
  const [allocBy, setAllocBy] = useState<'sector' | 'company'>('sector')
  const [allocOn, setAllocOn] = useState<string | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const rows = useMemo(() => positions(lots, quotes, metaBy), [lots, quotes, metaBy])
  const t = useMemo(() => totals(rows), [rows])
  const alloc = useMemo(
    () => slices(rows, allocBy, k => sectorLabel(k, locale), pf.unclassified), [rows, allocBy])

  const view = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = rows.filter(r => {
      if (filter === 'up' && !(r.pl != null && r.pl > 0)) return false
      if (filter === 'down' && !(r.pl != null && r.pl < 0)) return false
      if (!q) return true
      return r.sym.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    })
    const key = (r: Position) =>
      sort === 'pl' ? (r.pl ?? -Infinity)
      : sort === 'day' ? (r.dayChange ?? -Infinity)
      : sort === 'weight' ? (r.value ?? -Infinity)
      : (r.value ?? -Infinity)
    return filtered.sort((a, b) => (dir === 'desc' ? key(b) - key(a) : key(a) - key(b)))
  }, [rows, filter, query, sort, dir])

  // Focus the sheet when it opens, and restore nothing behind it — the trigger
  // is a toolbar button that stays mounted.
  useEffect(() => { if (sheet) sheetRef.current?.querySelector('input')?.focus() }, [sheet])
  useEffect(() => {
    if (!sheet && !confirm) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSheet(null); setConfirm(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet, confirm])

  const loading = !ready || pricesLoading
  const signedOut = !user

  function save() {
    if (!sheet) return
    const qty = parseFloat(sheet.qty), price = parseFloat(sheet.price)
    if (!sheet.sym || !(qty > 0) || !(price > 0)) return
    if (sheet.id) removeLot(sheet.id)
    addLot({
      sym: sheet.sym.toUpperCase(), qty, price,
      date: sheet.date || undefined, note: sheet.note || undefined,
    })
    setSheet(null)
  }

  return (
    <main className="pf-page iq-page" onClick={() => setMenu(null)}>
      <header className="pf-head">
        <div className="st-title">
          <h1>{pf.title}</h1>
          <p>
            <span className="pf-private" title={pf.privateTitle}>
              <i aria-hidden="true">◆</i> {pf.private}
            </span>
            <span className="pf-dot" aria-hidden="true">·</span>
            {signedOut ? pf.onThisDevice : pf.syncedWithAccount}
            <span className="pf-dot" aria-hidden="true">·</span>
            {pf.pricedAtClose}
          </p>
        </div>
        <div className="st-head-actions">
          <button type="button" className="pf-add" onClick={() => setSheet({ ...EMPTY_DRAFT })}>
            <i aria-hidden="true">+</i> {pf.addPosition}
          </button>
        </div>
      </header>

      {/* Sign-in is an offer, not a wall: the store works without it. */}
      {signedOut ? (
        <div className="pf-signin">
          <div>
            <strong>{pf.localTitle}</strong>
            <p>{pf.localNote}</p>
          </div>
          <Link className="pf-signin-go" href={L('/login')}>{pf.signIn}</Link>
        </div>
      ) : null}

      {loading ? (
        <>
          <div className="pf-summary"><span className="pl-skel" style={{ blockSize: 92, borderRadius: 16 }} /></div>
          <div className="pf-panel"><span className="pl-skel" style={{ blockSize: 320, borderRadius: 16 }} /></div>
        </>
      ) : !rows.length ? (
        <section className="pf-empty">
          <strong>{pf.emptyTitle}</strong>
          <p>
            {pf.emptyLead}
          </p>
          <button type="button" className="pf-add pf-add-lg" onClick={() => setSheet({ ...EMPTY_DRAFT })}>
            <i aria-hidden="true">+</i> {pf.addFirst}
          </button>
          <span className="pf-empty-note">{pf.emptyNote}</span>
        </section>
      ) : (
        <>
          {/* ── Summary · one composition, not five cards ──────────────────── */}
          <section className="pf-summary" aria-label={pf.summaryLabel}>
            <div className="pf-total">
              <span className="cd-cell-label">{pf.currentValue}</span>
              <strong><bdi>{iqd(t.value)}</bdi><em>{pf.iqd}</em></strong>
              <p className="pf-total-sub">
                {t.dayChange == null ? (
                  <span className="mv-dash" title={pf.noPriorSession}>—</span>
                ) : (
                  <>
                    <bdi className={t.dayChange > 0 ? 'positive' : t.dayChange < 0 ? 'negative' : ''}>
                      {signedIqd(t.dayChange)}
                    </bdi>
                    <span>{pf.vsPrevSession}</span>
                    <bdi className={t.dayChange > 0 ? 'positive' : t.dayChange < 0 ? 'negative' : ''}>
                      {pct(t.dayPct)}
                    </bdi>
                  </>
                )}
              </p>
            </div>
            {/* Each figure named precisely: «الربح» alone would collapse three
                different quantities into one word. */}
            <dl className="pf-figs">
              <div><dt>{pf.totalCost}</dt><dd><bdi>{iqd(t.cost)}</bdi></dd></div>
              <div>
                <dt>
                  {pf.unrealised}
                  <i className="fn-help" tabIndex={0} role="note"
                    data-help={pf.unrealisedHelpLong}
                    aria-label={pf.unrealisedHelp}>{locale === 'ar' ? '؟' : '?'}</i>
                </dt>
                <dd className={t.pl > 0 ? 'positive' : t.pl < 0 ? 'negative' : ''}>
                  <bdi>{signedIqd(t.pl)}</bdi>
                </dd>
              </div>
              <div>
                <dt>{pf.totalReturn}</dt>
                <dd className={t.pl > 0 ? 'positive' : t.pl < 0 ? 'negative' : ''}>
                  <bdi>{pct(t.plPct)}</bdi>
                </dd>
              </div>
              <div><dt>{pf.positions}</dt><dd><bdi>{t.holdings}</bdi></dd></div>
            </dl>
            {t.unvalued ? (
              /* The exclusion is stated ON the total it affects. */
              <p className="pf-excluded">
                <bdi>{t.unvalued}</bdi>{' '}
                {t.unvalued === 1
                  ? <>{pf.unvaluedOne}</>
                  : <>{pf.unvaluedMany}</>}
                {' '}<bdi>{iqd(t.unvaluedCost)}</bdi> {pf.iqd}.
              </p>
            ) : null}
          </section>

          {/* ── Holdings ──────────────────────────────────────────────────── */}
          <section className="pf-panel">
            <div className="pf-panel-head">
              <h2>{pf.positions}</h2>
              <div className="st-switch pf-filters" role="group" aria-label={pf.filterGroup}>
                {FILTERS.map(f => (
                  <button key={f.id} type="button" className={filter === f.id ? 'active' : ''}
                    aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.id === 'all' ? pf.filterAll : f.id === 'up' ? pf.filterUp : pf.filterDown}</button>
                ))}
              </div>
              <label className="pf-search">
                <span className="sr-only">{pf.searchPositions}</span>
                <input type="search" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder={pf.searchPositions} aria-label={pf.searchPositions} />
              </label>
            </div>

            {!view.length ? (
              <div className="cd-nodata">
                <strong>{pf.noMatch}</strong>
                <p>{pf.noMatchNote}</p>
                <button type="button" className="pf-cancel"
                  onClick={() => { setFilter('all'); setQuery('') }}>{pf.reset}</button>
              </div>
            ) : (
              <div className="pf-scroll">
                <table className="pf-table">
                  <thead>
                    <tr>
                      <th scope="col" className="pf-col-co">{pf.colCompany}</th>
                      <th scope="col" className="pf-col-num">{pf.colQty}</th>
                      <th scope="col" className="pf-col-num">{pf.colAvgCost}</th>
                      <Th id="day" label={pf.colPriceVsPrev} sort={sort} dir={dir} setSort={setSort} setDir={setDir} />
                      <Th id="value" label={pf.colValue} sort={sort} dir={dir} setSort={setSort} setDir={setDir} />
                      <Th id="pl" label={pf.unrealised} sort={sort} dir={dir} setSort={setSort} setDir={setDir} />
                      <Th id="weight" label={pf.colWeight} sort={sort} dir={dir} setSort={setSort} setDir={setDir} />
                      <th scope="col" className="pf-col-act"><span className="sr-only">{pf.colActions}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.map(h => (
                      <Row key={h.sym} h={h} total={t.value}
                        open={openLots === h.sym}
                        onToggle={() => setOpenLots(s => (s === h.sym ? null : h.sym))}
                        menuOpen={menu === h.sym}
                        onMenu={e => { e.stopPropagation(); setMenu(m => (m === h.sym ? null : h.sym)) }}
                        onAddLot={() => { setMenu(null); setSheet({ ...EMPTY_DRAFT, sym: h.sym }) }}
                        onEditLot={l => { setMenu(null); setSheet({ id: l.id, sym: l.sym, qty: String(l.qty), price: String(l.price), date: l.date ?? '', note: l.note ?? '' }) }}
                        onRemove={() => { setMenu(null); setConfirm(h) }} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="st-foot">
              {pf.formulaNote}
            </p>
          </section>

          {/* ── Allocation ────────────────────────────────────────────────── */}
          {alloc.length ? (
            <section className="pf-panel pf-alloc-panel">
              <div className="pf-panel-head">
                <h2>{pf.allocation}</h2>
                <div className="st-switch" role="group" aria-label={pf.allocBasis}>
                  <button type="button" className={allocBy === 'sector' ? 'active' : ''}
                    aria-pressed={allocBy === 'sector'} onClick={() => setAllocBy('sector')}>{pf.bySector}</button>
                  <button type="button" className={allocBy === 'company' ? 'active' : ''}
                    aria-pressed={allocBy === 'company'} onClick={() => setAllocBy('company')}>{pf.byCompany}</button>
                </div>
              </div>
              <div className="pl-readout" aria-live="polite">
                {allocOn && alloc.find(x => x.key === allocOn) ? (() => {
                  const s = alloc.find(x => x.key === allocOn)!
                  return (
                    <>
                      <span className="pl-readout-name">{s.label}</span>
                      <span className="pl-read"><em>{pf.value}</em><bdi>{nf0.format(Math.round(s.value))}</bdi><em>{pf.iqd}</em></span>
                      <span className="pl-read"><em>{pf.weight}</em><bdi>{s.pct.toFixed(1)}%</bdi></span>
                      {allocBy === 'sector'
                        ? <span className="pl-read"><em>{pf.positionsShort}</em><bdi>{s.count}</bdi></span> : null}
                    </>
                  )
                })() : <span className="pl-readout-hint">{pf.allocationHint}</span>}
              </div>
              <ul className="pf-alloc">
                {alloc.map(s => (
                  <li key={s.key} className={allocOn === s.key ? 'is-on' : ''}
                    onPointerEnter={() => setAllocOn(s.key)} onPointerLeave={() => setAllocOn(null)}>
                    <button type="button" onFocus={() => setAllocOn(s.key)} onBlur={() => setAllocOn(null)}
                      aria-label={pf.sliceLabel(s.label, s.pct.toFixed(1), nf0.format(Math.round(s.value)))}>
                      <span className="pf-alloc-label">{s.label}</span>
                      <span className="pf-alloc-track" aria-hidden="true">
                        <i style={{ inlineSize: `${s.pct}%` }} />
                      </span>
                      <bdi className="pf-alloc-pct">{s.pct.toFixed(1)}%</bdi>
                      <bdi className="pf-alloc-val">{iqd(s.value)}</bdi>
                    </button>
                  </li>
                ))}
              </ul>
              {t.unvalued ? (
                <p className="st-foot">
                  {pf.allocExcludes}
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      )}

      {/* ── Add / edit sheet ─────────────────────────────────────────────── */}
      {sheet ? (
        <div className="pf-overlay" role="dialog" aria-modal="true"
          aria-label={sheet.id ? pf.editLot : pf.addPosition}
          onClick={e => { if (e.target === e.currentTarget) setSheet(null) }}>
          <div className="pf-sheet" ref={sheetRef}>
            <div className="pf-sheet-head">
              <h2>{sheet.id ? pf.editLot : pf.addPosition}</h2>
              <button type="button" className="pf-x" onClick={() => setSheet(null)} aria-label={pf.close}>×</button>
            </div>
            <div className="pf-form">
              <label className="pf-field">
                <span>{pf.company}</span>
                <TickerPicker meta={meta} value={sheet.sym}
                  onChange={v => setSheet(s => s && { ...s, sym: v })} />
              </label>
              <div className="pf-field-row">
                <label className="pf-field">
                  <span>{pf.quantity}</span>
                  <input value={sheet.qty} inputMode="decimal" autoComplete="off"
                    onChange={e => setSheet(s => s && { ...s, qty: e.target.value.replace(/[^\d.]/g, '') })} />
                </label>
                <label className="pf-field">
                  <span>{pf.buyPrice}</span>
                  <input value={sheet.price} inputMode="decimal" autoComplete="off"
                    onChange={e => setSheet(s => s && { ...s, price: e.target.value.replace(/[^\d.]/g, '') })} />
                </label>
              </div>
              <details className="pf-more" open={!!(sheet.date || sheet.note)}>
                <summary>{pf.optionalDetails}</summary>
                <div className="pf-field-row">
                  <label className="pf-field">
                    <span>{pf.buyDate}</span>
                    <input type="date" value={sheet.date}
                      onChange={e => setSheet(s => s && { ...s, date: e.target.value })} />
                  </label>
                  <label className="pf-field">
                    <span>{pf.note}</span>
                    <input value={sheet.note} autoComplete="off"
                      onChange={e => setSheet(s => s && { ...s, note: e.target.value })} />
                  </label>
                </div>
                <p className="pf-hint">
                  {pf.dateOptional}
                </p>
              </details>

              {(() => {
                const qty = parseFloat(sheet.qty), price = parseFloat(sheet.price)
                if (!(qty > 0) || !(price > 0)) return null
                return (
                  <div className="pf-preview">
                    <span>{pf.cost}</span>
                    <bdi>{iqd(qty * price)}</bdi><span>{pf.iqd}</span>
                  </div>
                )
              })()}
            </div>
            <div className="pf-sheet-foot">
              <button type="button" className="pf-cancel" onClick={() => setSheet(null)}>{pf.cancel}</button>
              <button type="button" className="pf-save" onClick={save}
                disabled={!sheet.sym || !(parseFloat(sheet.qty) > 0) || !(parseFloat(sheet.price) > 0)}>
                {sheet.id ? pf.save : pf.add}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Destructive confirm · names what it destroys ─────────────────── */}
      {confirm ? (
        <div className="pf-overlay" role="dialog" aria-modal="true" aria-label={pf.confirmDelete}
          onClick={e => { if (e.target === e.currentTarget) setConfirm(null) }}>
          <div className="pf-sheet pf-confirm">
            <div className="pf-sheet-head"><h2>{pf.deletePosition}</h2></div>
            <p>
              {pf.willDelete(confirm.name)}{' '}
              <bdi>{confirm.lots.length}</bdi>{' '}
              {confirm.lots.length === 1 ? pf.lotOne : confirm.lots.length === 2 ? pf.lotTwo : pf.lotMany}.
              {pf.cannotUndo}
            </p>
            <div className="pf-sheet-foot">
              <button type="button" className="pf-cancel" onClick={() => setConfirm(null)}>{pf.cancel}</button>
              <button type="button" className="pf-delete"
                onClick={() => { removeSym(confirm.sym); setConfirm(null) }}>{pf.deletePosition}</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function Th({ id, label, sort, dir, setSort, setDir }: {
  id: SortId; label: string; sort: SortId; dir: 'desc' | 'asc'
  setSort: (s: SortId) => void; setDir: (d: 'desc' | 'asc') => void
}) {
  const { t: T, locale, href: L } = useLocale()
  const pf = T.personal.portfolio
  const on = sort === id
  // aria-sort belongs on the header cell, not on the button inside it.
  return (
    <th scope="col" className="pf-col-num"
      aria-sort={on ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className={on ? 'st-sort is-active' : 'st-sort'}
        onClick={() => { if (on) setDir(dir === 'desc' ? 'asc' : 'desc'); else { setSort(id); setDir('desc') } }}>
        {label}<i aria-hidden="true">{on ? (dir === 'desc' ? '▾' : '▴') : '·'}</i>
      </button>
    </th>
  )
}

function Row({ h, total, open, onToggle, menuOpen, onMenu, onAddLot, onEditLot, onRemove }: {
  h: Position; total: number; open: boolean; onToggle: () => void
  menuOpen: boolean; onMenu: (e: React.MouseEvent) => void
  onAddLot: () => void; onEditLot: (l: Lot) => void; onRemove: () => void
}) {
  const { t: T, locale, href: L } = useLocale()
  const pf = T.personal.portfolio
  const weight = h.value != null && total > 0 ? (h.value / total) * 100 : null
  return (
    <>
      <tr className={h.value == null ? 'pf-row pf-unvalued' : 'pf-row'}>
        <td className="pf-col-co">
          <button type="button" className="pf-co" onClick={onToggle}
            aria-expanded={open} aria-label={pf.showLots(h.name)}>
            <span className="pf-co-name">
              <strong title={h.name}>{h.name}</strong>
              <bdi className="cd-ticker">{h.sym}</bdi>
            </span>
            <i className="pf-co-caret" aria-hidden="true">{open ? '▾' : '‹'}</i>
          </button>
        </td>
        <td className="pf-col-num"><bdi>{nf0.format(h.qty)}</bdi></td>
        <td className="pf-col-num"><bdi>{h.avg.toFixed(2)}</bdi></td>
        <td className="pf-col-num">
          {h.price == null ? (
            <span className="mv-dash" title={pf.noCurrentPrice}>—</span>
          ) : (
            <span className="pf-price">
              <bdi>{h.price.toFixed(2)}</bdi>
              {h.dayChange == null
                ? <span className="mv-dash" title={pf.noPriorSession}>—</span>
                : <bdi className={h.dayPct != null && h.dayPct > 0 ? 'positive' : h.dayPct != null && h.dayPct < 0 ? 'negative' : ''}>
                    {pct(h.dayPct)}
                  </bdi>}
              {h.staleDays != null && h.staleDays > 1
                ? <em className="pf-stale" title={pf.carriedTitle(String(h.staleDays))}>{pf.carried}</em>
                : null}
            </span>
          )}
        </td>
        <td className="pf-col-num">
          {h.value == null ? <span className="mv-dash">—</span> : <bdi>{iqd(h.value)}</bdi>}
        </td>
        <td className="pf-col-num">
          {h.pl == null ? <span className="mv-dash">—</span> : (
            <span className={h.pl > 0 ? 'positive' : h.pl < 0 ? 'negative' : ''}>
              <bdi>{signedIqd(h.pl)}</bdi>
              <bdi className="pf-pl-pct">{pct(h.plPct)}</bdi>
            </span>
          )}
        </td>
        <td className="pf-col-num">
          {weight == null ? <span className="mv-dash">—</span> : <bdi>{weight.toFixed(1)}%</bdi>}
        </td>
        <td className="pf-col-act">
          <button type="button" className="pf-menu-btn" onClick={onMenu}
            aria-haspopup="menu" aria-expanded={menuOpen} aria-label={pf.actionsFor(h.name)}>⋯</button>
          {menuOpen ? (
            <div className="pf-menu" role="menu" onClick={e => e.stopPropagation()}>
              <Link role="menuitem" href={L(`/c/${h.sym.toLowerCase()}`)}>{pf.companyPage}</Link>
              <button type="button" role="menuitem" onClick={onAddLot}>{pf.addLot}</button>
              <button type="button" role="menuitem" className="pf-menu-danger" onClick={onRemove}>
                {pf.deletePosition}
              </button>
            </div>
          ) : null}
        </td>
      </tr>
      {open ? (
        <tr className="pf-lots-row">
          <td colSpan={8}>
            <ul className="pf-lots">
              {h.lots.map(l => (
                <li key={l.id}>
                  <bdi>{nf0.format(l.qty)}</bdi><span>{pf.sharesAt}</span>
                  <bdi>{l.price.toFixed(2)}</bdi><span>{pf.iqd}</span>
                  {l.date ? <><span className="pf-dot" aria-hidden="true">·</span><bdi>{l.date}</bdi></> : null}
                  {l.note ? <><span className="pf-dot" aria-hidden="true">·</span><em>{l.note}</em></> : null}
                  <button type="button" className="pf-lot-edit" onClick={() => onEditLot(l)}>{pf.edit}</button>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      ) : null}
    </>
  )
}
