'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { SiteShell } from './SiteShell'
import { PageTitle } from './PageTitle'
import { ToolsRail, CompanyPicker, nf2 } from './tools'
import { useMarketData, useAlerts, alertHit, type Alert } from '@/lib/portfolio'
import { localeDate } from '@/lib/date'
import '@/styles/tools-page.css'

/**
 * /alerts · price alerts, checked against the last official close.
 *
 * One form (company, direction, target) and one table (company, condition,
 * price now, state). A hit is stamped the first time the close satisfies
 * the condition and cleared when it no longer does, so an alert re-arms.
 * No push, no email — the page says so.
 */
export function AlertsPage() {
  const { t, locale, href: L } = useLocale()
  const A = t.personal.tools.alerts
  const T = t.personal.tools
  const W = t.personal.watchlist
  const { user, openAuth } = useApp()
  const { meta, metaBy, prices, loading } = useMarketData()
  const { alerts, ready, addAlert, removeAlert, setAll } = useAlerts()
  const [sym, setSym] = useState('')
  const [dir, setDir] = useState<'above' | 'below'>('above')
  const [target, setTarget] = useState('')
  const [err, setErr] = useState(false)
  const name = (s: string) => { const m = metaBy.get(s); return m ? ((locale === 'ar' ? m.ar || m.en : m.en || m.ar) || s) : s }

  /* Stamp triggeredAt the first time the condition holds; clear it when it
     no longer does. Only when something actually changes, so the synced
     list is not rewritten on every price read. */
  useEffect(() => {
    if (!ready || !Object.keys(prices).length) return
    let changed = false
    const next: Alert[] = alerts.map((a) => {
      const p = prices[a.sym]
      if (!p) return a
      const hit = alertHit(a, p)
      if (hit && !a.triggeredAt) { changed = true; return { ...a, triggeredAt: new Date().toISOString() } }
      if (!hit && a.triggeredAt) { changed = true; return { ...a, triggeredAt: null } }
      return a
    })
    if (changed) setAll(next)
  }, [prices, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => alerts.slice().sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)), [alerts])
  const submit = () => {
    const tg = parseFloat(target)
    if (!sym || !(tg > 0)) { setErr(true); return }
    addAlert({ sym, dir, target: tg, basePrice: prices[sym] ?? 0 })
    setSym(''); setTarget(''); setErr(false)
  }

  return (
    <SiteShell>
      <main className="tl id-full iq-door">
        <ToolsRail />
        <div className="tl-body">
          <header className="tl-head">
            <p className="id-eyebrow">{T.eyebrow} · {user ? W.syncedWithAccount : W.onThisDevice}</p>
            <PageTitle title={A.title} note={A.note} />
            {!user ? <p className="id-cap">{W.localNote} <button type="button" className="id-link tl-linkbtn" onClick={() => openAuth('signin')}>{W.signIn}</button></p> : null}
          </header>

          <form className="id-panel tl-form" onSubmit={(e) => { e.preventDefault(); submit() }} aria-label={A.add}>
            <CompanyPicker meta={meta} value={sym} onChange={setSym} label={T.pick} />
            <div><span className="id-cap">{A.when}</span>
              <div className="id-pills" role="group" aria-label={A.when}>
                <button type="button" className="id-pill is-sm" aria-pressed={dir === 'above'} onClick={() => setDir('above')}>{A.above}</button>
                <button type="button" className="id-pill is-sm" aria-pressed={dir === 'below'} onClick={() => setDir('below')}>{A.below}</button>
              </div>
            </div>
            <label><span className="id-cap">{A.target}</span><input className="id-input" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
            <div className="tl-form-actions tl-wide">
              <button type="submit" className="id-btn is-sm is-primary">{A.save}</button>
              {sym && prices[sym] ? <span className="id-cap id-num">{A.current(sym, nf2.format(prices[sym]))}</span> : null}
              {err ? <span className="id-cap id-down">{A.invalid}</span> : null}
              {loading ? <span className="id-cap">{T.loadingPrices}…</span> : null}
            </div>
          </form>

          {!ready ? null : !list.length ? (
            <p className="id-note"><b>{A.empty}</b> · {A.emptyNote}</p>
          ) : (
            <div className="id-table-scroll">
              <table className="id-table tl-table id-num">
                <thead>
                  <tr>
                    <th scope="col">{A.colCompany}</th>
                    <th scope="col">{A.colCondition}</th>
                    <th scope="col" className="is-end">{A.colNow}</th>
                    <th scope="col">{A.colState}</th>
                    <th scope="col" className="is-end">{W.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id} className={a.triggeredAt ? 'is-hit' : ''}>
                      <td><Link href={L(`/c/${a.sym}`)} className="id-name tl-name">{name(a.sym)}</Link><span className="id-sub"><bdi>{a.sym}</bdi> · {A.created(localeDate(a.createdAt.slice(0, 10), locale))}</span></td>
                      <td>{a.dir === 'above' ? A.above : A.below} <bdi>{nf2.format(a.target)}</bdi></td>
                      <td className="is-end">{prices[a.sym] ? <bdi>{nf2.format(prices[a.sym])}</bdi> : <span className="id-cap">{W.noPrice}</span>}</td>
                      <td>{a.triggeredAt ? <span className="id-chg is-up">{A.hit} · {localeDate(a.triggeredAt.slice(0, 10), locale)}</span> : <span className="id-chg is-flat">{A.waiting}</span>}</td>
                      <td className="is-end"><button type="button" className="id-btn is-sm" onClick={() => removeAlert(a.id)}>{A.remove}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </SiteShell>
  )
}
