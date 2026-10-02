'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { SiteShell } from './SiteShell'
import { PageTitle } from './PageTitle'
import { ToolsRail, CompanyPicker, nf2, pctStr } from './tools'
import { useMarketData, usePortfolio } from '@/lib/portfolio'
import { sectorLabel } from '@/lib/screener'
import '@/styles/econ-page.css'
import '@/styles/tools-page.css'

/**
 * /watchlist · one list, in the order it was added to.
 *
 * A table: company · sector · price · change against the previous session
 * · actions. Companies without a current price stay listed and say so.
 * The list itself is the AppContext watchlist (localStorage, synced to the
 * profile when signed in); prices come from `useMarketData`.
 */
export function WatchlistPage() {
  const { t, locale, href: L } = useLocale()
  const W = t.personal.watchlist
  const T = t.personal.tools
  const { user, openAuth, watchlist, toggleWatchlist } = useApp()
  const { meta, metaBy, quotes, loading } = useMarketData()
  const { lots } = usePortfolio()
  const [pick, setPick] = useState('')
  const [q, setQ] = useState('')
  const [pickKey, setPickKey] = useState(0)
  const name = (sym: string) => { const m = metaBy.get(sym); return m ? ((locale === 'ar' ? m.ar || m.en : m.en || m.ar) || sym) : sym }
  const held = useMemo(() => new Set(lots.map((l) => l.sym)), [lots])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (watchlist ?? []).filter((s) => !needle || `${s} ${name(s)}`.toLowerCase().includes(needle))
  }, [watchlist, q]) // eslint-disable-line react-hooks/exhaustive-deps

  const WB = W.board
  const moves = useMemo(() => {
    let up = 0, down = 0
    for (const sym of watchlist ?? []) { const qt = quotes[sym]; if (qt?.prev && qt.price) { if (qt.price > qt.prev) up++; else if (qt.price < qt.prev) down++ } }
    return { up, down }
  }, [watchlist, quotes])
  const count = watchlist?.length ?? 0

  return (
    <SiteShell>
      <main className="tl id-full iq-door" data-world="lapis" data-level="accent">
        <ToolsRail />
        <div className="tl-body">
          <p className="id-eyebrow fx-crumb">{T.eyebrow} · {user ? W.syncedWithAccount : W.onThisDevice}</p>
          <div className="fx-frame">
            <div className="fx-board">
              <div className="fx-lead">
                <header className="fx-head">
                  <PageTitle title={W.title} note={T.watchlistNote} className="fx-title" />
                </header>
                <p className="fx-huge id-num">
                  <span className="fx-huge-num">
                    <bdi>{count}</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                </p>
                <p className="fx-line"><span>{WB.unit(count)}{count ? ` · ${WB.moves(String(moves.up), String(moves.down))}` : ''}</span></p>
                {!user ? <p className="id-cap">{W.localNote} <button type="button" className="id-link tl-linkbtn" onClick={() => openAuth('signin')}>{W.signIn}</button></p> : null}
              </div>
              <form className="id-print is-key fx-calc pf-add" aria-label={WB.addTitle} onSubmit={(e) => { e.preventDefault(); if (pick && !watchlist?.includes(pick)) { toggleWatchlist?.(pick); setPick(''); setPickKey((k) => k + 1) } }}>
                <h2 className="fx-calc-title">{WB.addTitle}</h2>
                <CompanyPicker key={pickKey} meta={meta} value={pick} onChange={setPick} label={W.searchToAdd} />
                {pick && quotes[pick]?.price ? <p className="fx-calc-note id-num">{name(pick)} · <bdi>{nf2.format(quotes[pick].price)}</bdi></p> : null}
                <button type="submit" className="id-btn is-primary pf-go" disabled={!pick || watchlist?.includes(pick)}>{W.addCompanyBtn}</button>
                {loading ? <p className="fx-calc-prev">{T.loadingPrices}…</p> : null}
              </form>
            </div>
          </div>

          <section aria-label={WB.list}>
            <div className="wl-tools">
              <h2 className="id-h3">{WB.list}</h2>
              {count ? <input type="search" className="id-input tl-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={W.searchList} aria-label={W.searchList} /> : null}
            </div>
            {!count ? (
              <p className="id-print is-calm pf-empty"><b>{W.emptyTitle}</b> · {W.emptyNote}</p>
            ) : !rows.length ? (
              <p className="id-print is-calm pf-empty"><b>{W.noMatch}</b> · {W.noMatchNote}</p>
            ) : (
              <ul className="wl-cards id-num">
                {rows.map((sym) => {
                  const qt = quotes[sym]
                  const chg = qt?.prev && qt.price ? ((qt.price - qt.prev) / qt.prev) * 100 : null
                  const sec = String(metaBy.get(sym)?.sec ?? '')
                  return (
                    <li key={sym} className="id-print is-calm wl-card">
                      <div className="wl-top">
                        <Link href={L(`/c/${sym}`)} className="wl-name">{name(sym)}</Link>
                        <button type="button" className="ac-x" onClick={() => toggleWatchlist?.(sym)} aria-label={`${W.removeFromWatchlist} · ${name(sym)}`}>×</button>
                      </div>
                      <small className="wl-sub"><bdi>{sym}</bdi>{sec ? ` · ${sectorLabel(sec, locale)}` : ''}{held.has(sym) ? ` · ${W.inPortfolio}` : ''}</small>
                      <div className="wl-row">
                        {qt?.price ? <b className="wl-price"><bdi>{nf2.format(qt.price)}</bdi></b> : <span className="id-cap">{W.noPrice}</span>}
                        {chg != null ? <span className={`id-chg ${chg > 0 ? 'is-up' : chg < 0 ? 'is-down' : 'is-flat'}`}><bdi>{pctStr(chg)}</bdi></span> : null}
                      </div>
                      {qt?.staleDays ? <small className="wl-sub">{W.carried(String(qt.staleDays))}</small> : null}
                    </li>
                  )
                })}
              </ul>
            )}
            {count ? <p className="id-cap tl-note">{W.oneListNote}.{W.noQuoteNote}</p> : null}
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
