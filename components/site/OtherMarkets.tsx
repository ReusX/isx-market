'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { proFetch, usePro } from '@/lib/proClient'
import '@/styles/pro.css'

/**
 * The dollar on the six other exchanges the Kifah channel posts (Harthiya,
 * Al-Samawal, Basra, Erbil, Sulaymaniyah, Duhok) · an «IQWealth برو» block.
 * The page carries only the names; the numbers come from /api/pro/markets
 * for a reader with a running pass.
 */
const ORDER = ['harthiya', 'samawal', 'basra', 'erbil', 'sulaymaniyah', 'duhok'] as const
type Q = { market: string; bid: number; ask: number; at: string }
const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export function OtherMarkets({ compact }: { compact?: boolean }) {
  const { t, locale, href: L } = useLocale()
  const M = t.pro.markets
  const pro = usePro()
  const [d, setD] = useState<{ kifah: { bid: number; ask: number } | null; markets: Q[] } | null>(null)
  useEffect(() => {
    if (!pro.until) return
    proFetch('/api/pro/markets').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setD(j) }).catch(() => {})
  }, [pro.until])
  const time = (iso: string) => new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { timeZone: 'Asia/Baghdad', weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
  const locked = !d

  return (
    <section className={`pro-mk id-print is-calm ${compact ? 'is-compact' : ''}`} data-world="ochre" aria-labelledby="pro-mk-h">
      <div className="pro-mk-head">
        <h2 id="pro-mk-h" className="pro-mk-h"><i aria-hidden="true" />{M.title}</h2>
        <span className="pro-tag">{t.pro.eyebrow}</span>
      </div>
      <p className="pro-mk-note">{M.note}</p>
      {d && !d.markets.length ? <p className="pro-mk-note">{M.none}</p> : (
        <table className="pro-mk-table id-num">
          <thead><tr><th scope="col" /><th scope="col">{M.bid}</th><th scope="col">{M.ask}</th><th scope="col">{M.vsKifah}</th></tr></thead>
          <tbody>
            {ORDER.map((k) => {
              const q = d?.markets.find((x) => x.market === k)
              const diff = q && d?.kifah ? q.ask - d.kifah.ask : null
              return (
                <tr key={k}>
                  <th scope="row">{M.names[k]}{q ? <small>{time(q.at)}</small> : null}</th>
                  <td>{locked ? <span className="pro-blur" aria-hidden="true">0,000</span> : q ? <bdi>{nf.format(q.bid)}</bdi> : '—'}</td>
                  <td>{locked ? <span className="pro-blur" aria-hidden="true">0,000</span> : q ? <bdi>{nf.format(q.ask)}</bdi> : '—'}</td>
                  <td>{locked ? <span className="pro-blur" aria-hidden="true">+0</span> : diff == null ? '—' : <bdi dir="ltr" className={diff > 0 ? 'is-up' : diff < 0 ? 'is-down' : ''}>{diff > 0 ? '+' : diff < 0 ? '−' : ''}{nf.format(Math.abs(diff))}</bdi>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {locked && !pro.loading ? (
        <div className="pro-mk-lock">
          <p>{M.locked}</p>
          <Link className="pro-buy" href={L('/pro')}>{t.pro.lock.cta}</Link>
        </div>
      ) : null}
    </section>
  )
}
