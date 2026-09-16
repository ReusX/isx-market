'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CompanyLogo } from '@/components/CompanyLogo'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { PageTitle } from './PageTitle'
import { SECTORS, companyName } from '@/lib/market'
import { localeDate } from '@/lib/date'
import type { DirectoryRow } from '@/lib/marketServer'
import '@/styles/markets.css'
import '@/styles/directory.css'

/**
 * /companies · the directory of listed companies.
 *
 * Who is listed, not what the prices are: every company as a compact card —
 * logo, both names, ticker, sector, paid-in capital, trading status, and the
 * facts we hold (founded, listed, headquarters, one line of description)
 * — grouped by sector with counts, a sector jump list, search, and a status
 * filter. Rendered from server data so every card and every link to a
 * company page is in the HTML.
 */
const RAIL = [
  { key: 'market', route: '/' }, { key: 'board', route: '/market' }, { key: 'companies', route: '/companies' },
  { key: 'screener', route: '/screener' }, { key: 'heatmap', route: '/heatmap' }, { key: 'statistics', route: '/statistics' }, { key: 'pulse', route: '/pulse' },
] as const

const int = new Intl.NumberFormat('en-US')
function capital(v: number | null, u: { tn: string; bn: string; mn: string; k: string }): string {
  if (!v) return '—'
  if (v >= 1e12) return `${(v / 1e12).toFixed(v >= 1e13 ? 0 : 1)} ${u.tn}`
  if (v >= 1e9) return `${(v / 1e9).toFixed(v >= 1e10 ? 0 : 1)} ${u.bn}`
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)} ${u.mn}`
  return int.format(v)
}

export function DirectoryPage({ rows, session }: { rows: DirectoryRow[]; session: string | null }) {
  const { t, locale, href: L } = useLocale()
  const d = t.market.page.directory
  const p = t.market.page
  const u = t.site.units
  const ar = locale === 'ar'
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | DirectoryRow['status']>('all')
  const [order, setOrder] = useState<'sector' | 'capital' | 'name'>('sector')

  const sectorName = (id: string) => { const s = SECTORS.find((x) => x.id === id); return s ? (ar ? s.arFull : s.enFull) : id }
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const kept = rows
      .filter((r) => status === 'all' || r.status === status)
      .filter((r) => !needle || r.sym.toLowerCase().includes(needle) || r.ar.includes(q.trim()) || r.en.toLowerCase().includes(needle))
    const byName = (a: DirectoryRow, b: DirectoryRow) => companyName(a, a.sym, locale).localeCompare(companyName(b, b.sym, locale), locale)
    /* One flat group for the capital and alphabetical orders; sector groups otherwise. */
    if (order !== 'sector') return [['all', kept.slice().sort(order === 'capital' ? (a, b) => (b.shares ?? 0) - (a.shares ?? 0) : byName)] as const]
    const by = new Map<string, DirectoryRow[]>()
    for (const r of kept) (by.get(r.sec) ?? by.set(r.sec, []).get(r.sec)!).push(r)
    return Array.from(by.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([sec, list]) => [sec, list.sort(byName)] as const)
  }, [rows, q, status, order, locale])
  /* «43 في المصارف، 20 في الصناعة…» — the counts as a sentence the crawler reads. */
  const sectorSentence = useMemo(() => {
    const by = new Map<string, number>()
    for (const r of rows) by.set(r.sec, (by.get(r.sec) ?? 0) + 1)
    return d.bySector(Array.from(by.entries()).sort((a, b) => b[1] - a[1]).map(([sec, n]) => d.sectorPart(int.format(n), sectorName(sec))).join(ar ? '، ' : ', '))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, locale])
  const shown = groups.reduce((n, [, l]) => n + l.length, 0)
  const sectorCount = new Set(rows.map((r) => r.sec)).size

  return (
    <SiteShell>
      <main className="dr id-full iq-door">
        <DoorRail door="markets" items={RAIL.map((r) => ({ label: p.rail[r.key], route: r.route }))} />
        <div className="dr-body">
          <header className="dr-head">
            <p className="id-eyebrow">{d.eyebrow}</p>
            <PageTitle title={t.company.directory.h1(int.format(rows.length))} note={d.intro(int.format(rows.length), int.format(sectorCount))} />
            <p className="id-body dr-sectors id-num">{sectorSentence}</p>
          </header>

          <div className="dr-controls">
            <input id="dr-q" type="search" className="id-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={d.search} aria-label={d.search} />
            <div className="id-pills" role="group" aria-label={d.status.all}>
              {(['all', 'active', 'untraded', 'suspended'] as const).map((k) => (
                <button key={k} type="button" className="id-pill is-sm" aria-pressed={status === k} onClick={() => setStatus(k)}>{d.status[k]}</button>
              ))}
            </div>
            <div className="id-pills" role="group" aria-label={d.order.sector}>
              {(['sector', 'capital', 'name'] as const).map((k) => (
                <button key={k} type="button" className="id-pill is-sm" aria-pressed={order === k} onClick={() => setOrder(k)}>{d.order[k]}</button>
              ))}
            </div>
          </div>

          <nav className="dr-jump id-pills" aria-label={d.jump} hidden={order !== 'sector'}>
            {groups.map(([sec, list]) => <a key={sec} href={`#sec-${sec}`} className="id-pill is-sm">{sectorName(sec)} <span className="id-cap">{list.length}</span></a>)}
          </nav>

          {shown === 0 ? <p className="id-note">{d.empty}</p> : null}

          {groups.map(([sec, list]) => (
            <section key={sec} id={`sec-${sec}`} className="dr-sector">
              <h2 className="id-h2">{sec === 'all' ? d.all : sectorName(sec)} <span className="id-cap id-num">{d.count(int.format(list.length))}</span></h2>
              <ul className="dr-grid">
                {list.map((r) => (
                  <li key={r.sym} className={`dr-card is-${r.status}`}>
                    <Link href={L(`/c/${r.sym}`)} className="dr-card-link">
                      <CompanyLogo sym={r.sym} logo={r.logo} color={r.color} className="dr-logo" />
                      <span className="dr-names">
                        <span className="dr-name">{companyName(r, r.sym, locale)}</span>
                        <span className="id-sub">{ar ? r.en : r.ar} · {r.sym}</span>
                      </span>
                    </Link>
                    {r.blurb ? <p className="dr-blurb">{r.blurb}</p> : null}
                    <dl className="dr-facts id-num">
                      <div><dt>{d.capital}</dt><dd>{capital(r.shares, u)} {u.iqd}</dd></div>
                      {r.tier ? <div><dt>{d.tier}</dt><dd>{d.tiers[r.tier]}</dd></div> : null}
                      {r.founded ? <div><dt>{d.founded}</dt><dd>{r.founded}</dd></div> : null}
                      {r.listed ? <div><dt>{d.listed}</dt><dd>{r.listed}</dd></div> : null}
                      {r.hq ? <div><dt>{d.hq}</dt><dd>{r.hq}</dd></div> : null}
                    </dl>
                    <p className={`dr-status is-${r.status}`}>
                      {r.status === 'active' ? d.active
                        : r.status === 'suspended' && r.lastTrade ? d.suspended(localeDate(r.lastTrade, locale))
                        : r.lastTrade ? d.lastTrade(localeDate(r.lastTrade, locale)) : d.status.untraded}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="dr-about id-read" aria-label={d.about.title}>
            <h2 className="id-h2">{d.about.title}</h2>
            {d.about.body.map((tx, i) => <p key={i} className="id-body">{tx}</p>)}
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
