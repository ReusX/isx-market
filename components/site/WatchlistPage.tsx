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
  const name = (sym: string) => { const m = metaBy.get(sym); return m ? ((locale === 'ar' ? m.ar || m.en : m.en || m.ar) || sym) : sym }
  const held = useMemo(() => new Set(lots.map((l) => l.sym)), [lots])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (watchlist ?? []).filter((s) => !needle || `${s} ${name(s)}`.toLowerCase().includes(needle))
  }, [watchlist, q]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SiteShell>
      <main className="tl id-full iq-door">
        <ToolsRail />
        <div className="tl-body">
          <header className="tl-head">
            <p className="id-eyebrow">{T.eyebrow} · {user ? W.syncedWithAccount : W.onThisDevice}</p>
            <PageTitle title={W.title} note={T.watchlistNote} />
            {!user ? <p className="id-cap">{W.localNote} <button type="button" className="id-link tl-linkbtn" onClick={() => openAuth('signin')}>{W.signIn}</button></p> : null}
          </header>

          <div className="tl-tools">
            <CompanyPicker meta={meta} value={pick} onChange={setPick} label={W.searchToAdd} />
            <button type="button" className="id-btn is-sm is-primary" disabled={!pick || watchlist?.includes(pick)} onClick={() => { if (pick) { toggleWatchlist?.(pick); setPick('') } }}>{W.addCompanyBtn}</button>
            {watchlist?.length ? <input type="search" className="id-input tl-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={W.searchList} aria-label={W.searchList} /> : null}
            {loading ? <span className="id-cap">{T.loadingPrices}…</span> : null}
          </div>

          {!watchlist?.length ? (
            <p className="id-note"><b>{W.emptyTitle}</b> · {W.emptyNote}</p>
          ) : !rows.length ? (
            <p className="id-note"><b>{W.noMatch}</b> · {W.noMatchNote}</p>
          ) : (
            <div className="id-table-scroll">
              <table className="id-table tl-table id-num">
                <thead>
                  <tr>
                    <th scope="col">{W.colCompany}</th>
                    <th scope="col">{W.colSector}</th>
                    <th scope="col" className="is-end">{W.colPrice}</th>
                    <th scope="col" className="is-end">{W.colChange}</th>
                    <th scope="col" className="is-end">{W.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((sym) => {
                    const qt = quotes[sym]
                    const chg = qt?.prev && qt.price ? ((qt.price - qt.prev) / qt.prev) * 100 : null
                    const sec = String(metaBy.get(sym)?.sec ?? '')
                    return (
                      <tr key={sym}>
                        <td>
                          <Link href={L(`/c/${sym}`)} className="id-name tl-name">{name(sym)}</Link>
                          <span className="id-sub"><bdi>{sym}</bdi>{held.has(sym) ? ` · ${W.inPortfolio}` : ''}{qt?.staleDays ? ` · ${W.carried(String(qt.staleDays))}` : ''}</span>
                        </td>
                        <td>{sec ? sectorLabel(sec, locale) : '—'}</td>
                        <td className="is-end">{qt?.price ? <bdi>{nf2.format(qt.price)}</bdi> : <span className="id-cap">{W.noPrice}</span>}</td>
                        <td className="is-end">{chg == null ? <span className="id-cap">—</span> : <span className={`id-chg ${chg > 0 ? 'is-up' : chg < 0 ? 'is-down' : 'is-flat'}`}><bdi>{pctStr(chg)}</bdi></span>}</td>
                        <td className="is-end"><button type="button" className="id-btn is-sm" onClick={() => toggleWatchlist?.(sym)} aria-label={`${W.removeFromWatchlist} · ${name(sym)}`}>{W.remove}</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {watchlist?.length ? <p className="id-cap tl-note">{W.oneListNote}.{W.noQuoteNote}</p> : null}
        </div>
      </main>
    </SiteShell>
  )
}
