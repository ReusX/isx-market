'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { fetchLive, fetchCompanyMeta, mergeCompanies, companyName, SECTORS } from '@/lib/market'
import { sessionDate, type IndexRow } from '@/lib/homeData'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import '@/styles/markets.css'
import type { Company } from '@/types'

/**
 * /market · the foundation of the الأسواق door.
 *
 * Three things, top to bottom, and nothing else yet:
 *
 *   1. The session in four figures — ISX60, traded value, volume, breadth —
 *      on a navy block, so the page opens on what the market did.
 *   2. The door's rail: the pages that belong to الأسواق, as a sidebar.
 *   3. The board: every listed company, one row each — name, last price, the
 *      change as a chip, traded value — most active first, with one search
 *      field and the sector pills. A row is a link to the company page.
 *
 * An information surface, so it runs full width (.id-full); only the lede
 * caps its own line length.
 *
 * Data comes from the same sources as before (lib/market, daily_index);
 * nothing about how it is SHOWN is inherited. Both sources are fetched
 * independently, so a failed index does not blank the board.
 */
const price = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const int = new Intl.NumberFormat('en-US')

type Units = { bn: string; mn: string; k: string }
function compact(v: number | null | undefined, u: Units): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const a = Math.abs(v)
  if (a >= 1e9) return `${(v / 1e9).toFixed(a >= 1e10 ? 0 : 1)} ${u.bn}`
  if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1)} ${u.mn}`
  if (a >= 1e3) return `${(v / 1e3).toFixed(0)} ${u.k}`
  return int.format(v)
}

function Change({ pct, stale, untraded, noChange }: { pct: number; stale?: boolean; untraded: string; noChange: string }) {
  if (stale) return <span className="id-chg is-flat">{untraded}</span>
  if (!pct) return <span className="id-chg is-flat">{noChange}</span>
  const up = pct > 0
  return <span className={`id-chg ${up ? 'is-up' : 'is-down'}`}>{up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%</span>
}

const RAIL = [
  { key: 'market', route: '/market' }, { key: 'companies', route: '/companies' }, { key: 'screener', route: '/screener' },
  { key: 'heatmap', route: '/heatmap' }, { key: 'statistics', route: '/statistics' }, { key: 'pulse', route: '/pulse' },
] as const

export function MarketPage() {
  const { t, locale, href: L } = useLocale()
  const m = t.market
  const p = m.page
  const u = t.site.units
  const ar = locale === 'ar'

  const [companies, setCompanies] = useState<Company[]>([])
  const [session, setSession] = useState<string | null>(null)
  const [index, setIndex] = useState<{ latest: IndexRow; prev: IndexRow | null } | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sector, setSector] = useState('all')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      await Promise.allSettled([
        (async () => {
          const [live, meta] = await Promise.all([fetchLive(), fetchCompanyMeta()])
          if (!alive) return
          setCompanies(mergeCompanies(meta, live.stocks))
          setSession(live.updated || null)
        })().catch(() => alive && setFailed(true)),
        sb.from('daily_index')
          .select('date,isx60,total_value,total_volume,total_trades,traded_companies,listed_companies')
          .not('isx60', 'is', null).order('date', { ascending: false }).limit(2)
          .then(({ data }) => {
            if (!alive || !data?.length) return
            setIndex({ latest: data[0] as IndexRow, prev: (data[1] as IndexRow) ?? null })
          }),
      ])
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return companies
      .filter((c) => sector === 'all' || c.sec === sector)
      .filter((c) => !needle || c.sym.toLowerCase().includes(needle) || c.ar.includes(q.trim()) || c.en.toLowerCase().includes(needle))
      /* Traded companies first, most active at the top; the carried-forward
         rows follow, so «لم تُتداول» never outranks a real session. */
      .sort((a, b) => Number(Boolean(a.stale)) - Number(Boolean(b.stale)) || (b.vol || 0) - (a.vol || 0))
  }, [companies, q, sector])

  const idxPct = index?.prev ? ((index.latest.isx60 - index.prev.isx60) / index.prev.isx60) * 100 : 0

  return (
    <SiteShell>
      <main className="iqm id-full iq-door">
        <DoorRail door="markets" items={RAIL.map((r) => ({ label: p.rail[r.key], route: r.route }))} />
        <div className="iqm-body">
        <header className="iqm-head">
          <p className="id-eyebrow">{p.eyebrow}</p>
          <h1 className="id-h1">{m.title}</h1>
          <p className="id-lede">{p.lede}</p>
        </header>

        <section className="iqm-session id-block is-navy id-num" aria-label={m.summaryLabel}>
          <div className="iqm-session-head">
            <span>{session ? p.sessionOf(sessionDate(session, locale)) : ' '}</span>
            {index?.latest.traded_companies != null && index.latest.listed_companies != null
              ? <span>{p.tradedOf(String(index.latest.traded_companies), String(index.latest.listed_companies))}</span> : null}
          </div>
          <div className="iqm-figures">
            <div>
              <small>{p.index}</small>
              <strong>{index ? price.format(index.latest.isx60) : '—'}</strong>
              {index?.prev ? <Change pct={idxPct} untraded={p.untraded} noChange={p.noChange} /> : null}
            </div>
            <div><small>{m.tradedValue}</small><strong>{compact(index?.latest.total_value, u)}</strong><em>{u.iqd}</em></div>
            <div><small>{m.volume}</small><strong>{compact(index?.latest.total_volume, u)}</strong><em>{u.shares}</em></div>
            <div><small>{m.trades}</small><strong>{index?.latest.total_trades != null ? int.format(index.latest.total_trades) : '—'}</strong></div>
          </div>
        </section>

        <section className="iqm-board" aria-label={m.tableLabel}>
          <div className="iqm-controls">
            <input id="iqm-q" className="id-input" type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={m.searchPlaceholder} aria-label={m.searchLabel} />
            <div className="id-pills" role="group" aria-label={m.sectorLabel}>
              {SECTORS.map((s) => (
                <button key={s.id} type="button" className="id-pill is-sm" aria-pressed={sector === s.id} onClick={() => setSector(s.id)}>
                  {ar ? s.ar : s.en}
                </button>
              ))}
            </div>
          </div>

          {failed ? <p className="id-note">{p.loadFailed}</p> : null}

          <div className="id-table-scroll">
            <table className="id-table id-num iqm-table">
              {/* Defined columns: the company takes what is left; the
                  figures sit in fixed tracks, so nothing floats apart. */}
              <colgroup><col /><col className="iqm-c-price" /><col className="iqm-c-chg" /><col className="iqm-c-val" /></colgroup>
              <thead>
                <tr>
                  <th>{m.colCompany}</th>
                  <th className="is-end">{m.colPrice}</th>
                  <th className="is-end">{m.colChange}</th>
                  <th className="is-end iqm-hide-sm">{m.colValue}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.sym}>
                    <td>
                      <Link href={L(`/c/${c.sym}`)} className="iqm-co">
                        <span className="id-name">{companyName(c, locale)}</span>
                        <span className="id-sub">{c.sym} · {SECTORS.find((s) => s.id === c.sec)?.[ar ? 'ar' : 'en'] ?? c.sec}</span>
                      </Link>
                    </td>
                    <td className="is-end">{c.close ? price.format(c.close) : '—'}</td>
                    <td className="is-end"><Change pct={c.pct} stale={c.stale} untraded={p.untraded} noChange={p.noChange} /></td>
                    <td className="is-end iqm-hide-sm">{c.stale ? '—' : compact(c.vol, u)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !rows.length && !failed ? (
            <div className="iqm-empty"><p className="id-h3">{p.emptyTitle}</p><p className="id-cap">{p.emptyNote}</p></div>
          ) : null}
          {rows.length ? <p className="id-cap iqm-count">{p.showing(int.format(rows.length))}</p> : null}
        </section>
        </div>
      </main>
    </SiteShell>
  )
}
