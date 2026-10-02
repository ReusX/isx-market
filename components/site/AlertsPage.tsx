'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { SiteShell } from './SiteShell'
import { PageTitle } from './PageTitle'
import { ToolsRail, CompanyPicker, nf2 } from './tools'
import { useMarketData, useAlerts, alertHit, type Alert } from '@/lib/portfolio'
import { AlertCards } from './AlertCards'
import '@/styles/econ-page.css'
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
  const [pickKey, setPickKey] = useState(0)
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
    setSym(''); setTarget(''); setErr(false); setPickKey((k) => k + 1)
  }

  const hits = list.filter((a) => a.triggeredAt).length
  const AB = A.board

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
                  <PageTitle title={A.title} note={A.note} className="fx-title" />
                </header>
                <p className="fx-huge id-num">
                  <span className="fx-huge-num">
                    <bdi>{list.length}</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                </p>
                <p className="fx-line">
                  <span>{AB.unit(list.length)}{list.length ? ` · ${hits ? AB.hitLine(String(hits)) : AB.noneHit}` : ''}</span>
                </p>
                {!user ? <p className="id-cap">{W.localNote} <button type="button" className="id-link tl-linkbtn" onClick={() => openAuth('signin')}>{W.signIn}</button></p> : null}
              </div>

              <form className="id-print is-key fx-calc pf-add" onSubmit={(e) => { e.preventDefault(); submit() }} aria-label={A.add}>
                <h2 className="fx-calc-title">{A.add}</h2>
                <CompanyPicker key={pickKey} meta={meta} value={sym} onChange={setSym} label={T.pick} />
                <div className="fx-quick" role="group" aria-label={A.when}>
                  <button type="button" className="fx-qbtn" aria-pressed={dir === 'above'} onClick={() => setDir('above')}>{A.above}</button>
                  <button type="button" className="fx-qbtn" aria-pressed={dir === 'below'} onClick={() => setDir('below')}>{A.below}</button>
                </div>
                <label className="fx-calc-in"><span>{A.target}</span><input className="id-num" inputMode="decimal" dir="ltr" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
                {sym && prices[sym] ? <p className="fx-calc-note id-num">{A.current(sym, nf2.format(prices[sym]))}</p> : null}
                {err ? <p className="fx-calc-note id-down">{A.invalid}</p> : null}
                <button type="submit" className="id-btn is-primary pf-go">{A.save}</button>
                {loading ? <p className="fx-calc-prev">{T.loadingPrices}…</p> : null}
              </form>
            </div>
          </div>

          <section className="al-list" aria-label={AB.list}>
            <h2 className="id-h3 pf-h">{AB.list}</h2>
            {!ready ? null : !list.length ? (
              <p className="id-print is-calm pf-empty"><b>{A.empty}</b> · {A.emptyNote}</p>
            ) : (
              <AlertCards alerts={list} prices={prices} name={name} onRemove={removeAlert} />
            )}
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
