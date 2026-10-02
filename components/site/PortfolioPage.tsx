'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { SiteShell } from './SiteShell'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import { ToolsRail, CompanyPicker, nf0, nf2, pctStr, chgCls } from './tools'
import { useMarketData, usePortfolio, useAlerts, aggregate, totals, type Holding } from '@/lib/portfolio'
import { AlertCards } from './AlertCards'
import { sectorLabel } from '@/lib/screener'
import { localeDate } from '@/lib/date'
import '@/styles/econ-page.css'
import '@/styles/markets.css'
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
  const B = P.board
  const [draft, setDraft] = useState<Draft>(blank)
  const [pickKey, setPickKey] = useState(0)
  const { alerts, ready: alertsReady } = useAlerts()
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
    const qty = parseFloat(draft.qty), price = parseFloat(draft.price)
    if (!draft.sym || !(qty > 0) || !(price > 0)) return
    addLot({ sym: draft.sym, qty, price, date: draft.date || undefined, note: draft.note || undefined })
    setDraft(blank)
    setPickKey((k) => k + 1)
  }
  const cost = (parseFloat(draft.qty) || 0) * (parseFloat(draft.price) || 0)
  const canAdd = !!draft.sym && parseFloat(draft.qty) > 0 && parseFloat(draft.price) > 0
  const sideAlerts = useMemo(() => alerts.slice().sort((x, y) => (y.createdAt > x.createdAt ? 1 : -1)).slice(0, 5), [alerts])
  const sign = (v: number) => (v > 0 ? '+' : '')

  return (
    <SiteShell>
      <main className="tl id-full iq-door" data-world="lapis" data-level="accent">
        <ToolsRail />
        <div className="tl-body">
          <p className="id-eyebrow fx-crumb">{T.eyebrow} · {user ? P.syncedWithAccount : P.onThisDevice}</p>
          <div className="fx-frame">
            <div className="fx-board">
              <div className="fx-lead">
                <header className="fx-head">
                  <PageTitle title={P.title} note={T.portfolioNote} className="fx-title" />
                </header>
                <p className="fx-huge id-num">
                  <span className="fx-huge-num">
                    <bdi>{nf0.format(tot.value)}</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                </p>
                <p className="fx-line">
                  {dayChange ? <span className={`id-chg ${chgCls(dayChange.abs)}`}><bdi>{pctStr(dayChange.pct)}</bdi></span> : null}
                  <span>{B.unit}{dayChange ? <> · <bdi dir="ltr">{sign(dayChange.abs)}{nf0.format(dayChange.abs)}</bdi> {B.today}</> : holdings.length ? ` · ${P.noPriorSession}` : ''}</span>
                </p>
                <div className="fx-pair pf-pair id-num">
                  <div><small>{P.totalCost}</small><b><bdi>{nf0.format(tot.cost)}</bdi></b></div>
                  <div><small>{P.unrealised}</small><b className={tot.pl > 0 ? 'id-up' : tot.pl < 0 ? 'id-down' : ''}><bdi dir="ltr">{sign(tot.pl)}{nf0.format(tot.pl)}</bdi></b></div>
                  <div><small>{P.totalReturn}</small><b className={tot.plPct > 0 ? 'id-up' : tot.plPct < 0 ? 'id-down' : ''}><bdi>{pctStr(tot.cost ? tot.plPct : null)}</bdi></b></div>
                </div>
                {alloc.length ? (
                  <figure className="fx-ladder pf-alloc">
                    <figcaption>{P.allocation} · {P.bySector}</figcaption>
                    <ol>
                      {alloc.map((x, i) => (
                        <li key={x.key}>
                          <span>{x.label}</span>
                          <i className={i === 0 ? 'is-best' : undefined} style={{ width: `${Math.max(3, x.pct)}%` }} />
                          <b className="id-num"><bdi>{x.pct.toFixed(1)}%</bdi></b>
                        </li>
                      ))}
                    </ol>
                  </figure>
                ) : null}
                {unvalued.length ? <p className="id-cap">{unvalued.length} {unvalued.length === 1 ? P.unvaluedOne : P.unvaluedMany} <bdi>{nf0.format(unvalued.reduce((sum, h) => sum + h.cost, 0))}</bdi> {P.iqd}.</p> : null}
                {!user ? <p className="id-cap">{P.localNote} <button type="button" className="id-link tl-linkbtn" onClick={() => openAuth('signin')}>{P.signIn}</button></p> : null}
              </div>

              <form className="id-print is-key fx-calc pf-add" onSubmit={(e) => { e.preventDefault(); save() }} aria-label={B.addTitle}>
                <h2 className="fx-calc-title">{B.addTitle}</h2>
                <CompanyPicker key={pickKey} meta={meta} value={draft.sym} onChange={(sym) => setDraft((d) => ({ ...d, sym, price: d.price || (prices[sym] ? String(prices[sym]) : '') }))} label={P.company} />
                <div className="pf-two">
                  <label className="fx-calc-in"><span>{P.quantity}</span><input className="id-num" inputMode="decimal" dir="ltr" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} /></label>
                  <label className="fx-calc-in"><span>{P.buyPrice}</span><input className="id-num" inputMode="decimal" dir="ltr" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></label>
                </div>
                <div className="pf-two">
                  <label className="fx-calc-in"><span>{P.buyDate}</span><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label>
                  <label className="fx-calc-in"><span>{P.note}</span><input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
                </div>
                <p className="fx-calc-out id-num"><bdi>{nf0.format(cost)}</bdi> <span>{P.iqd}</span></p>
                <p className="fx-calc-note">{P.dateOptional}</p>
                <button type="submit" className="id-btn is-primary pf-go" disabled={!canAdd}>{P.add}</button>
                {loading ? <p className="fx-calc-prev">{T.loadingPrices}…</p> : null}
              </form>
            </div>
          </div>

          <div className="pf-split">
            <section className="pf-main" aria-label={B.positions}>
              <h2 className="id-h3 pf-h">{B.positions}</h2>
              {!ready ? null : !holdings.length ? (
                <p className="id-print is-calm pf-empty"><b>{P.emptyTitle}</b> · {P.emptyLead}</p>
              ) : (
                <div className="fx-scroll">
                  <table className="mb-table tl-table pf-table id-num">
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
            </section>
            <aside className="pf-side" aria-label={B.myAlerts}>
              <h2 className="id-h3 pf-h">{B.myAlerts}</h2>
              {alertsReady && sideAlerts.length ? <AlertCards alerts={sideAlerts} prices={prices} name={name} /> : <p className="id-cap">{B.noAlerts}</p>}
              <p className="id-cap pf-more"><Link href="/alerts" hrefLang="ar">{sideAlerts.length ? B.allAlerts : B.newAlert} ←</Link></p>
            </aside>
          </div>

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
