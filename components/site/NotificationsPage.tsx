'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { PageTitle } from './PageTitle'
import { ToolsRail, CompanyPicker } from './tools'
import { useMarketData } from '@/lib/portfolio'
import {
  isNativeApp, permission, enablePush, pushApi, savedToken,
  type AlertKind, type Permission, type PushState, type Topic,
} from '@/lib/nativePush'
import '@/styles/econ-page.css'
import '@/styles/tools-page.css'

/**
 * /notifications · what the app sends to this phone.
 *
 * Three states, in the order a reader meets them: on the website (explains the
 * app is where notifications live); in the app without permission (one button
 * that triggers the system dialog — the app never asks unprompted); in the app
 * with permission (topic switches and price alerts, stored server-side against
 * this phone's FCM token by /api/push).
 */
const TOPICS: Topic[] = ['fx', 'gold', 'market']
const KINDS: AlertKind[] = ['fx', 'gold', 'stock']
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export function NotificationsPage() {
  const { t } = useLocale()
  const N = t.personal.tools.notify
  const T = t.personal.tools
  const { meta, prices } = useMarketData()

  const [native, setNative] = useState<boolean | null>(null)
  const [perm, setPerm] = useState<Permission>('unsupported')
  const [st, setSt] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [now, setNow] = useState<{ fx: number | null; gold: number | null }>({ fx: null, gold: null })

  const [kind, setKind] = useState<AlertKind>('fx')
  const [sym, setSym] = useState('')
  const [op, setOp] = useState<'above' | 'below'>('above')
  const [target, setTarget] = useState('')

  useEffect(() => {
    const n = isNativeApp()
    setNative(n)
    if (!n) return
    permission().then(async (p) => {
      setPerm(p)
      if (p === 'granted' && savedToken()) {
        try { setSt(await pushApi('get')) } catch { setSt(await enablePush().catch(() => null)) }
      }
    })
    // Current prices, so a target is set against a real number.
    Promise.all([
      fetch('/data/fx.json').then((r) => r.json()).catch(() => null),
      fetch('/data/gold.json').then((r) => r.json()).catch(() => null),
    ]).then(([fx, gold]) => {
      const rate = fx?.parallel?.sell ?? fx?.parallel?.buy
      const g21 = (gold?.gramByCarat as { karat: number; mithqalIqd: number }[] | undefined)?.find((g) => g.karat === 21)
      setNow({ fx: rate ? rate * 100 : null, gold: g21?.mithqalIqd ?? null })
    })
  }, [])

  const run = useCallback(async (fn: () => Promise<PushState | null>, errMsg = N.failed) => {
    setBusy(true); setErr(null)
    try { const s = await fn(); if (s) setSt(s) } catch (e) {
      const m = e instanceof Error ? e.message : ''
      setErr(m === 'too many alerts' ? N.tooMany : m === 'target out of range' ? N.outOfRange : errMsg)
    } finally { setBusy(false) }
  }, [N])

  const turnOn = () => run(async () => {
    const s = await enablePush()
    setPerm(await permission())
    return s
  })

  const toggle = (topic: Topic) => {
    if (!st) return
    const topics = st.topics.includes(topic) ? st.topics.filter((x) => x !== topic) : [...st.topics, topic]
    run(() => pushApi('topics', { topics }))
  }

  const current = kind === 'fx' ? now.fx : kind === 'gold' ? now.gold : (sym ? prices[sym] ?? null : null)
  const add = () => {
    const v = parseFloat(target.replace(/,/g, ''))
    if (!(v > 0) || (kind === 'stock' && !sym)) { setErr(N.invalid); return }
    run(async () => {
      const s = await pushApi('add_alert', { kind, op, target: v, ...(kind === 'stock' ? { symbol: sym } : {}) })
      setTarget('')
      return s
    })
  }

  const fmt = (k: AlertKind, v: number) => (k === 'stock' ? nf2 : nf0).format(v)
  const nameOf = (s: string | null) => (s ? meta.find((m) => m.sym === s)?.ar ?? s : '')

  return (
    <SiteShell>
      <main className="tl id-full iq-door" data-world="lapis" data-level="accent">
        <ToolsRail />
        <div className="tl-body">
          <header className="tl-head">
            <p className="id-eyebrow">{T.eyebrow}</p>
            <PageTitle title={N.title} note={N.note} />
          </header>

          {native === false ? <p className="id-print is-calm nt-card id-body">{N.webOnly}</p> : null}

          {native && perm !== 'granted' ? (
            <section className="id-print is-calm nt-card tl-form" aria-label={N.enable}>
              {perm === 'denied' ? <p className="id-body tl-wide">{N.denied}</p> : (
                <>
                  <p className="id-body tl-wide">{N.enableNote}</p>
                  <button type="button" className="id-btn is-primary" disabled={busy} onClick={turnOn}>{N.enable}</button>
                </>
              )}
            </section>
          ) : null}

          {err ? <p className="id-note" role="alert">{err}</p> : null}

          {native && perm === 'granted' && st ? (
            <>
              <section className="id-print is-calm nt-card" aria-label={N.topicsTitle}>
                <h2 className="id-h3">{N.topicsTitle}</h2>
                <ul className="nt-list">
                  {TOPICS.map((tp) => (
                    <li key={tp} className="nt-row">
                      <label className="nt-switch">
                        <input type="checkbox" checked={st.topics.includes(tp)} disabled={busy} onChange={() => toggle(tp)} />
                        <span><b>{N.topics[tp].name}</b><br /><span className="id-cap">{N.topics[tp].note}</span></span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>

              <form className="id-print is-calm nt-card tl-form" aria-label={N.alertsTitle} onSubmit={(e) => { e.preventDefault(); add() }}>
                <h2 className="id-h3 tl-wide">{N.alertsTitle}</h2>
                <p className="id-cap tl-wide">{N.alertsNote}</p>
                <div className="fx-quick" role="group" aria-label={N.alertsTitle}>
                  {KINDS.map((k) => <button key={k} type="button" className="fx-qbtn" aria-pressed={kind === k} onClick={() => setKind(k)}>{N.kinds[k]}</button>)}
                </div>
                {kind === 'stock' ? <CompanyPicker meta={meta} value={sym} onChange={setSym} label={T.pick} /> : null}
                <div className="fx-quick" role="group">
                  <button type="button" className="fx-qbtn" aria-pressed={op === 'above'} onClick={() => setOp('above')}>{N.above}</button>
                  <button type="button" className="fx-qbtn" aria-pressed={op === 'below'} onClick={() => setOp('below')}>{N.below}</button>
                </div>
                <label>
                  <span className="id-cap">{N.target} · {N.units[kind]}</span>
                  <input id="notify-target" className="id-input id-num" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
                </label>
                {current ? <p className="id-cap id-num tl-wide">{N.now(fmt(kind, current))}</p> : null}
                <button type="submit" className="id-btn is-primary" disabled={busy}>{N.add}</button>
              </form>

              <section className="id-print is-calm nt-card" aria-label={N.alertsTitle}>
                {st.alerts.length === 0 ? <p className="id-cap">{N.empty}</p> : (
                  <ul className="nt-list">
                    {st.alerts.map((a) => (
                      <li key={a.id} className="nt-row">
                        <span>
                          <b>{a.kind === 'stock' ? nameOf(a.symbol) : N.kinds[a.kind]}</b>{' · '}
                          {a.op === 'above' ? N.above : N.below} <bdi className="id-num">{fmt(a.kind, a.target)}</bdi>
                          <br />
                          <span className="id-cap">{a.triggered_at ? N.fired(fmt(a.kind, a.triggered_value ?? a.target)) : N.waiting}</span>
                        </span>
                        <button type="button" className="id-link tl-linkbtn" disabled={busy} onClick={() => run(() => pushApi('remove_alert', { id: a.id }))}>{N.remove}</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </SiteShell>
  )
}
