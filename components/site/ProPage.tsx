'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { localeDate } from '@/lib/date'
import { proFetch, usePro } from '@/lib/proClient'
import { SiteShell } from './SiteShell'
import { PageTitle } from './PageTitle'
import '@/styles/econ-page.css'
import '@/styles/pro.css'

/**
 * /pro · «IQWealth برو»: two passes, what they open, what stays free.
 * The price shown here is only a label; the server charges from lib/pro.ts PLANS.
 */
const PRICES = { month: 5_000, year: 50_000 } as const
const nf = new Intl.NumberFormat('en-US')

export function ProPage() {
  const { t, locale } = useLocale()
  const P = t.pro
  const { user, openAuth } = useApp()
  const pro = usePro()
  const [busy, setBusy] = useState<'month' | 'year' | null>(null)
  const [err, setErr] = useState(false)

  const buy = async (plan: 'month' | 'year') => {
    if (!user) { openAuth('signin'); return }
    setBusy(plan); setErr(false)
    try {
      const r = await proFetch('/api/pro/checkout', { method: 'POST', body: JSON.stringify({ plan }) })
      const j = (await r.json()) as { url?: string }
      if (!r.ok || !j.url) throw new Error(String(r.status))
      location.href = j.url
    } catch {
      setErr(true); setBusy(null)
    }
  }

  return (
    <SiteShell>
      <main className="pro id-full" data-world="ochre" data-level="accent">
        <div className="pro-body id-read">
          <p className="id-eyebrow">{P.eyebrow}</p>
          <PageTitle title={P.title} note={P.standfirst} />

          {pro.until ? <p className="pro-active id-print is-calm">{P.active(localeDate(pro.until.slice(0, 10), locale))} · {P.extend}</p> : null}

          <h2 className="id-h3">{P.plans}</h2>
          <div className="pro-plans">
            {(['month', 'year'] as const).map((k) => (
              <section key={k} className={`pro-plan id-print ${k === 'year' ? 'is-key' : 'is-calm'}`} aria-labelledby={`pro-${k}`}>
                <h3 id={`pro-${k}`} className="pro-plan-h">{P[k]}</h3>
                <p className="pro-price id-num"><bdi>{nf.format(PRICES[k])}</bdi> <small>{locale === 'ar' ? 'دينار' : 'IQD'}</small></p>
                <p className="pro-note">{k === 'year' ? <>{P.perMonth(nf.format(Math.round(PRICES.year / 12)))} · <b>{P.save(nf.format(PRICES.month * 12 - PRICES.year))}</b></> : ' '}</p>
                <button type="button" className="pro-buy" disabled={!!busy || !pro.open} onClick={() => buy(k)}>
                  {!pro.open ? P.soon : busy === k ? P.busy : user ? P.buy[k] : P.signIn}
                </button>
              </section>
            ))}
          </div>
          {err ? <p className="pro-err" role="alert">{P.failed}</p> : null}
          <p className="pro-small">{P.paidWith}{pro.test ? <> <b>{P.testMode}</b></> : null}</p>

          <div className="pro-lists">
            <section aria-labelledby="pro-paid">
              <h2 id="pro-paid" className="id-h3">{P.paidHeading}</h2>
              <ul className="pro-list is-paid">{P.paid.map((x) => <li key={x}>{x}</li>)}</ul>
            </section>
            <section aria-labelledby="pro-free">
              <h2 id="pro-free" className="id-h3">{P.freeHeading}</h2>
              <ul className="pro-list">{P.free.map((x) => <li key={x}>{x}</li>)}</ul>
            </section>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}

/** /pro/done · Wayl sends the buyer back here with ?referenceId=…; we ask Wayl ourselves. */
export function ProDonePage() {
  const { t, locale, href: L } = useLocale()
  const D = t.pro.done
  const { user, authLoading, openAuth } = useApp()
  const ref = useSearchParams()?.get('referenceId') ?? ''
  const [state, setState] = useState<{ k: 'checking' | 'paid' | 'pending' | 'failed' | 'signin'; until?: string }>({ k: 'checking' })

  useEffect(() => {
    if (authLoading) return
    if (!user) { setState({ k: 'signin' }); return }
    let live = true, tries = 0
    const check = async () => {
      try {
        const r = await proFetch('/api/pro/verify', { method: 'POST', body: JSON.stringify({ referenceId: ref }) })
        const j = (await r.json()) as { paid?: boolean; status?: string; proUntil?: string | null }
        if (!live) return
        if (j.paid) { setState({ k: 'paid', until: j.proUntil ?? undefined }); return }
        if (['cancelled', 'rejected', 'returned'].includes(String(j.status))) { setState({ k: 'failed' }); return }
      } catch { /* retry below */ }
      if (++tries < 6) setTimeout(check, 4000)
      else if (live) setState({ k: 'pending' })
    }
    check()
    return () => { live = false }
  }, [ref, user?.id, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const msg = state.k === 'paid' ? D.paid(state.until ? localeDate(state.until.slice(0, 10), locale) : '—')
    : state.k === 'pending' ? D.pending : state.k === 'failed' ? D.failed : state.k === 'signin' ? D.signIn : D.checking
  return (
    <SiteShell>
      <main className="pro id-full" data-world="ochre" data-level="accent">
        <div className="pro-body id-read">
          <p className="id-eyebrow">{t.pro.eyebrow}</p>
          <PageTitle title={D.title} />
          <p className={`pro-done id-print ${state.k === 'paid' ? 'is-key' : 'is-calm'}`} role="status">{msg}</p>
          <p className="pro-actions">
            {state.k === 'signin' ? <button type="button" className="pro-buy" onClick={() => openAuth('signin')}>{t.pro.signIn}</button> : null}
            {state.k === 'paid' ? <Link className="pro-buy" href={L('/companies')}>{D.go}</Link> : null}
            <Link className="fx-qbtn" href={L('/pro')}>{D.back}</Link>
          </p>
        </div>
      </main>
    </SiteShell>
  )
}
