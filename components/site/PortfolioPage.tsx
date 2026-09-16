'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { SiteShell } from './SiteShell'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import { ToolsRail, CompanyPicker, nf0, nf2, pctStr, chgCls } from './tools'
import { useMarketData, usePortfolio, aggregate, totals, type Holding } from '@/lib/portfolio'
import { sectorLabel } from '@/lib/screener'
import { localeDate } from '@/lib/date'
import '@/styles/tools-page.css'

/**
 * /portfolio · the reader's own positions.
 *
 * Four figures, then the positions as one table — company, quantity,
 * average cost, price against the previous session, value, unrealised
 * profit, weight — each position opening to its lots. Add a position with
 * one form. Allocation by sector as bars. Everything is priced off the
 * last official close and computed in `lib/portfolio`, unchanged.
 *
 * Private data: kept in this browser, synced to the profile when signed
 * in. The page is noindex and renders its empty state on the server.
 */
type Draft = { sym: string; qty: string; price: string; date: string; note: string }
const blank: Draft = { sym: '', qty: '', price: '', date: '', note: '' }

export function PortfolioPage() {
  const { t, locale, href: L } = useLocale()
  const P = t.personal.portfolio
  const T = t.personal.tools
  const { user, openAuth } = useApp()
  const { meta, metaBy, prices, quotes, loading } = useMarketData()
  const { lots, ready, addLot, removeLot, removeSym } = usePortfolio()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const name = (sym: string) => { const m = metaBy.get(sym); return m ? ((locale === 'ar' ? m.ar || m.en : m.en || m.ar) || sym) : sym }

  const holdings = useMemo(() => aggregate(lots, prices), [lots, prices])
  const valued = holdings.filter((h) => h.price > 0)
  const unvalued = holdings.filter((h) => !(h.price > 0))
  const tot = useMemo(() => totals(valued), [valued])
  const dayChange = useMemo(() => {
    let prev = 0, cur = 0
    for (const h of valued) { const q = quotes[h.sym]; if (q?.prev) { prev += h.qty * q.prev; cur += h.qty * h.price } }
    return prev ? { abs: cur - prev, pct: ((cur - prev) / prev) * 100 } : null
  }, [valued, quotes])
  const alloc = useMemo(() => {
    const by = new Map<string, number>()
    for (const h of valued) { const k = String(metaBy.get(h.sym)?.sec ?? ''); by.set(k, (by.get(k) ?? 0) + h.value) }
    return Array.from(by.entries()).map(([k, v]) => ({ key: k, label: k ? sectorLabel(k, locale) : P.unclassified, value: v, pct: tot.value ? (v / tot.value) * 100 : 0 })).sort((a, b) => b.value - a.value)
  }, [valued, metaBy, tot.value, locale, P.unclassified])

  const save = () => {
    if (!draft) return
    const qty = parseFloat(draft.qty), price = parseFloat(draft.price)
    if (!draft.sym || !(qty > 0) || !(price > 0)) return
    addLot({ sym: draft.sym, qty, price, date: draft.date || undefined, note: draft.note || undefined })
    setDraft(null)
  }

  return (
    <SiteShell>
      <main className="tl id-full iq-door">
        <ToolsRail />
        <div className="tl-body">
          <header className="tl-head">
            <p className="id-eyebrow">{T.eyebrow} · {user ? P.syncedWithAccount : P.onThisDevice}</p>
            <PageTitle title={P.title} note={T.portfolioNote} />
            {!user ? <p className="id-cap">{P.localNote} <button type="button" className="id-link tl-linkbtn" onClick={() => openAuth('signin')}>{P.signIn}</button></p> : null}
          </header>

          <div className="id-stats id-num tl-stats">
            <div className="id-stat"><small>{P.currentValue}</small><b><bdi>{nf0.format(tot.value)}</bdi></b>{dayChange ? <span className={`id-chg ${chgCls(dayChange.abs)}`}><bdi>{dayChange.abs > 0 ? '+' : ''}{nf0.format(dayChange.abs)} · {pctStr(dayChange.pct)}</bdi></span> : <span className="id-cap">{P.noPriorSession}</span>}</div>
            <div className="id-stat"><small>{P.totalCost}</small><b><bdi>{nf0.format(tot.cost)}</bdi></b></div>
            <div className="id-stat"><small>{P.unrealised}</small><b className={tot.pl > 0 ? 'id-up' : tot.pl < 0 ? 'id-down' : ''}><bdi>{tot.pl > 0 ? '+' : ''}{nf0.format(tot.pl)}</bdi></b></div>
            <div className="id-stat"><small>{P.totalReturn}</small><b className={tot.plPct > 0 ? 'id-up' : tot.plPct < 0 ? 'id-down' : ''}><bdi>{pctStr(tot.cost ? tot.plPct : null)}</bdi></b></div>
          </div>
          {unvalued.length ? <p className="id-cap tl-note">{unvalued.length} {unvalued.length === 1 ? P.unvaluedOne : P.unvaluedMany} <bdi>{nf0.format(unvalued.reduce((s, h) => s + h.cost, 0))}</bdi> {P.iqd}.</p> : null}

          <div className="tl-tools">
            <button type="button" className="id-btn is-sm is-primary" onClick={() => setDraft(blank)}>{P.addPosition}</button>
            {loading ? <span className="id-cap">{T.loadingPrices}…</span> : null}
          </div>

          {draft ? (
            <form className="id-panel tl-form" onSubmit={(e) => { e.preventDefault(); save() }} aria-label={P.addPosition}>
              <CompanyPicker meta={meta} value={draft.sym} onChange={(sym) => setDraft({ ...draft, sym, price: draft.price || (prices[sym] ? String(prices[sym]) : '') })} label={P.company} />
              <label><span className="id-cap">{P.quantity}</span><input className="id-input" inputMode="decimal" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} /></label>
              <label><span className="id-cap">{P.buyPrice}</span><input className="id-input" inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></label>
              <label><span className="id-cap">{P.buyDate}</span><input className="id-input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label>
              <label className="tl-wide"><span className="id-cap">{P.note}</span><input className="id-input" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
              <p className="id-cap tl-wide">{P.dateOptional}</p>
              <div className="tl-form-actions tl-wide">
                <button type="submit" className="id-btn is-sm is-primary" disabled={!draft.sym || !(parseFloat(draft.qty) > 0) || !(parseFloat(draft.price) > 0)}>{P.add}</button>
                <button type="button" className="id-btn is-sm" onClick={() => setDraft(null)}>{P.cancel}</button>
                {draft.qty && draft.price ? <span className="id-cap id-num">{P.cost}: <bdi>{nf0.format((parseFloat(draft.qty) || 0) * (parseFloat(draft.price) || 0))}</bdi></span> : null}
              </div>
            </form>
          ) : null}

          {!ready ? null : !holdings.length ? (
            <p className="id-note"><b>{P.emptyTitle}</b> · {P.emptyLead}</p>
          ) : (
            <div className="id-table-scroll">
              <table className="id-table tl-table id-num">
                <thead>
                  <tr>
                    <th scope="col">{P.colCompany}</th>
                    <th scope="col" className="is-end">{P.colQty}</th>
                    <th scope="col" className="is-end">{P.colAvgCost}</th>
                    <th scope="col" className="is-end">{P.colPriceVsPrev}</th>
                    <th scope="col" className="is-end">{P.colValue}</th>
                    <th scope="col" className="is-end">{P.unrealised}</th>
                    <th scope="col" className="is-end">{P.colWeight}</th>
                    <th scope="col" className="is-end">{P.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h: Holding) => {
                    const q = quotes[h.sym]
                    const day = q?.prev && h.price ? ((h.price - q.prev) / q.prev) * 100 : null
                    const isOpen = open === h.sym
                    return (
                      <RowGroup key={h.sym} h={h} isOpen={isOpen} onToggle={() => setOpen(isOpen ? null : h.sym)}
                        name={name(h.sym)} day={day} carried={q?.staleDays ?? null} weight={tot.value && h.price > 0 ? (h.value / tot.value) * 100 : null}
                        onRemove={() => { if (window.confirm(`${P.willDelete(name(h.sym))} ${h.lots.length === 1 ? P.lotOne : h.lots.length === 2 ? P.lotTwo : `${h.lots.length} ${P.lotMany}`}. ${P.cannotUndo}`)) removeSym(h.sym) }}
                        onRemoveLot={removeLot} L={L} P={P} locale={locale} removeLabel={t.personal.watchlist.remove} />
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {alloc.length ? (
            <section className="id-panel tl-panel" aria-label={P.allocation}>
              <PageTitle as="h2" className="id-h3" title={`${P.allocation} · ${P.bySector}`} note={P.allocExcludes} />
              <ul className="tl-alloc id-num">
                {alloc.map((a) => (
                  <li key={a.key}>
                    <span className="tl-alloc-l">{a.label}</span>
                    <span className="tl-alloc-bar"><i style={{ width: `${a.pct}%` }} /></span>
                    <span className="tl-alloc-v"><bdi>{a.pct.toFixed(1)}%</bdi> <span className="id-cap">{nf0.format(a.value)}</span></span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <AboutSection title={t.company.page.about.title} body={[P.formulaNote, P.unrealisedHelpLong, P.dateOptional]} />
        </div>
      </main>
    </SiteShell>
  )
}

function RowGroup({ h, isOpen, onToggle, name, day, carried, weight, onRemove, onRemoveLot, L, P, locale, removeLabel }: {
  h: Holding; isOpen: boolean; onToggle: () => void; name: string; day: number | null; carried: number | null; weight: number | null
  onRemove: () => void; onRemoveLot: (id: string) => void; L: (p: string) => string; P: ReturnType<typeof useLocale>['t']['personal']['portfolio']; locale: 'ar' | 'en'; removeLabel: string
}) {
  return (
    <>
      <tr>
        <td>
          <Link href={L(`/c/${h.sym}`)} className="id-name tl-name">{name}</Link>
          <span className="id-sub"><bdi>{h.sym}</bdi>{carried != null && carried > 0 ? ` · ${P.carried}` : ''}</span>
        </td>
        <td className="is-end"><bdi>{nf0.format(h.qty)}</bdi></td>
        <td className="is-end"><bdi>{nf2.format(h.avg)}</bdi></td>
        <td className="is-end">{h.price > 0 ? <><bdi>{nf2.format(h.price)}</bdi><span className={`id-sub ${day == null ? '' : day > 0 ? 'id-up' : day < 0 ? 'id-down' : ''}`}><bdi>{pctStr(day)}</bdi></span></> : <span className="id-cap">{P.noCurrentPrice}</span>}</td>
        <td className="is-end"><bdi>{h.price > 0 ? nf0.format(h.value) : '—'}</bdi></td>
        <td className="is-end">{h.price > 0 ? <bdi className={h.pl > 0 ? 'id-up' : h.pl < 0 ? 'id-down' : ''}>{h.pl > 0 ? '+' : ''}{nf0.format(h.pl)} · {pctStr(h.plPct)}</bdi> : '—'}</td>
        <td className="is-end"><bdi>{weight == null ? '—' : `${weight.toFixed(1)}%`}</bdi></td>
        <td className="is-end tl-actions">
          <button type="button" className="id-btn is-sm" aria-expanded={isOpen} onClick={onToggle}>{h.lots.length === 1 ? P.lotOne : h.lots.length === 2 ? P.lotTwo : `${h.lots.length} ${P.lotMany}`}</button>
          <button type="button" className="id-btn is-sm" onClick={onRemove}>{P.deletePosition}</button>
        </td>
      </tr>
      {isOpen ? h.lots.map((l) => (
        <tr key={l.id} className="tl-lot">
          <td><span className="id-cap">{l.date ? localeDate(l.date, locale) : '—'}{l.note ? ` · ${l.note}` : ''}</span></td>
          <td className="is-end"><bdi>{nf0.format(l.qty)}</bdi></td>
          <td className="is-end"><bdi>{nf2.format(l.price)}</bdi></td>
          <td className="is-end" colSpan={4}><span className="id-cap"><bdi>{nf0.format(l.qty * l.price)}</bdi> {P.iqd}</span></td>
          <td className="is-end"><button type="button" className="id-btn is-sm" onClick={() => onRemoveLot(l.id)}>{removeLabel}</button></td>
        </tr>
      )) : null}
    </>
  )
}
