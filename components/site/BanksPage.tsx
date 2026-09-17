'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import type { BanksInitial, HubRow } from '@/lib/banksServer'
import '@/styles/banks-page.css'

/**
 * /banks · the banking door's hub.
 *
 * The table is the page: one row per bank in the Central Bank's directory,
 * defined column tracks, a fact per cell — type, ownership, the directory's
 * status (with the dollar restriction as a small marker, because it is a
 * separate fact and twenty-five operating banks carry it), the listed
 * ticker, what the bank publishes, latest filed assets, and an editorial
 * rating where one exists. Full width; it is an information surface.
 *
 * Above it, the one number a saver comes for: the term-deposit rates the
 * banks actually publish, highest first, each with its term and basis.
 *
 * Everything is server-seeded by `loadBanksHub`; this component fetches
 * nothing. Filters and sort are local, as on the board.
 */

type Filter = 'all' | 'commercial' | 'islamic' | 'investment' | 'listed' | 'state' | 'foreign' | 'publishing'
type SortKey = 'name' | 'type' | 'ownership' | 'status' | 'assets' | 'rating'
type Dir = 'asc' | 'desc'
const FILTERS: Filter[] = ['all', 'commercial', 'islamic', 'investment', 'listed', 'state', 'foreign', 'publishing']
const SORTS: SortKey[] = ['name', 'type', 'ownership', 'status', 'assets', 'rating']
/** The direction a column starts in when first clicked: figures descend, words ascend. */
const FIRST: Record<SortKey, Dir> = { name: 'asc', type: 'asc', ownership: 'asc', status: 'asc', assets: 'desc', rating: 'desc' }
const STATUS_RANK = { operating: 0, establishment: 1, guardianship: 2, liquidation: 3 }

type Units = { tn: string; bn: string; mn: string; k: string }
function compact(v: number | null | undefined, u: Units): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const a = Math.abs(v)
  if (a >= 1e12) return `${(a / 1e12).toFixed(2)} ${u.tn}`
  if (a >= 1e9) return `${(a / 1e9).toFixed(0)} ${u.bn}`
  if (a >= 1e6) return `${(a / 1e6).toFixed(0)} ${u.mn}`
  return new Intl.NumberFormat('en-US').format(a)
}

export function BanksPage({ initial }: { initial: BanksInitial }) {
  const { t, locale, href: L } = useLocale()
  const B = t.banks
  const H = B.hub
  const u = t.site.units
  const ar = locale === 'ar'
  const name = (r: { ar: string; en: string }) => (ar ? r.ar : r.en || r.ar)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: 'assets', dir: 'desc' })

  /* View state in the URL — read on mount, written on change — so a filtered
     list is a link. The route stays static: nothing here reaches the server. */
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const f = sp.get('filter') as Filter | null
    if (f && FILTERS.includes(f)) setFilter(f)
    const k = sp.get('sort') as SortKey | null
    if (k && SORTS.includes(k)) setSort({ key: k, dir: sp.get('dir') === 'asc' ? 'asc' : sp.get('dir') === 'desc' ? 'desc' : FIRST[k] })
    const query = sp.get('q')
    if (query) setQ(query)
  }, [])
  useEffect(() => {
    const sp = new URLSearchParams()
    if (filter !== 'all') sp.set('filter', filter)
    if (sort.key !== 'assets' || sort.dir !== 'desc') { sp.set('sort', sort.key); if (sort.dir !== FIRST[sort.key]) sp.set('dir', sort.dir) }
    if (q.trim()) sp.set('q', q.trim())
    const qs = sp.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [filter, sort, q])
  const clickSort = (key: SortKey) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: FIRST[key] })

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const keep = (r: HubRow) => {
      if (needle && !`${r.ar} ${r.en} ${r.ticker ?? ''}`.toLowerCase().includes(needle)) return false
      switch (filter) {
        case 'commercial': case 'islamic': case 'investment': return r.type === filter
        case 'listed': return !!r.ticker
        case 'state': return r.ownership === 'state'
        case 'foreign': return r.ownership === 'foreign'
        case 'publishing': return r.deposits || r.loans
        default: return true
      }
    }
    const list = initial.rows.filter(keep)
    const byName = (a: HubRow, b: HubRow) => name(a).localeCompare(name(b), ar ? 'ar' : 'en')
    const m = sort.dir === 'asc' ? 1 : -1
    const word = (f: (r: HubRow) => string) => (a: HubRow, b: HubRow) => f(a).localeCompare(f(b), ar ? 'ar' : 'en') * m || byName(a, b)
    /* Figures: a missing value sorts last whichever way the column runs. */
    const num = (f: (r: HubRow) => number | null) => (a: HubRow, b: HubRow) => {
      const x = f(a), y = f(b)
      if (x == null && y == null) return byName(a, b)
      if (x == null) return 1
      if (y == null) return -1
      return (x - y) * m || byName(a, b)
    }
    switch (sort.key) {
      case 'name': return list.sort((a, b) => byName(a, b) * m)
      case 'type': return list.sort(word((r) => B.type[r.type]))
      case 'ownership': return list.sort(word((r) => B.ownership[r.ownership]))
      case 'status': return list.sort((a, b) => (STATUS_RANK[a.status] - STATUS_RANK[b.status]) * m || byName(a, b))
      case 'rating': return list.sort(num((r) => r.rating?.overall ?? null))
      default: return list.sort(num((r) => r.assets))
    }
  }, [initial.rows, q, filter, sort, ar]) // eslint-disable-line react-hooks/exhaustive-deps

  const c = initial.counts
  const nf = new Intl.NumberFormat('en-US')

  return (
    <SiteShell>
      <main className="bnk id-full iq-door">
        <DoorRail door="banking" />
        <div className="bnk-body">
          <header className="bnk-head">
            <p className="id-eyebrow">{H.eyebrow}</p>
            <PageTitle title={H.title} note={H.note} />
            <div className="id-stats bnk-counts id-num">
              <div className="id-stat"><b>{c.total}</b><small>{H.counts.total}</small></div>
              <div className="id-stat"><b>{c.listed}</b><small>{H.counts.listed}</small></div>
              <div className="id-stat"><b>{c.usd}</b><small>{H.counts.usd}</small></div>
              <div className="id-stat"><b>{c.guardianship + c.liquidation}</b><small>{H.counts.guardianship}</small></div>
              <div className="id-stat"><b>{c.publishing}</b><small>{H.counts.publishing}</small></div>
            </div>
          </header>

          {initial.deposits.length ? (
            <section className="bnk-dep" aria-label={H.depositsTitle}>
              <PageTitle as="h2" className="id-h3" title={H.depositsTitle} note={H.depositsNote} />
              <ol className="bnk-dep-list id-num">
                {initial.deposits.slice(0, 8).map((d) => (
                  <li key={`${d.slug}-${d.nameEn}`}>
                    <Link href={L(`/banks/${d.slug}`)} className="bnk-dep-bank">{name(d)}</Link>
                    <span className="bnk-dep-name id-cap">{ar ? d.nameAr : d.nameEn}{d.currency !== 'IQD' ? ` · ${d.currency}` : ''}</span>
                    <b className="bnk-dep-rate"><bdi>{d.rate}{d.rateTo != null ? `–${d.rateTo}` : ''}%</bdi></b>
                    <span className="bnk-dep-basis id-cap">{d.islamic ? H.expected : H.perYear}{d.termMonths ? ` · ${H.months(String(d.termMonths))}` : ''}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <div className="bnk-tools">
            <input type="search" className="id-input bnk-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={H.search} aria-label={H.search} />
            <div className="id-pills" role="group" aria-label={B.filterGroup}>
              {FILTERS.map((f) => (
                <button key={f} type="button" className="id-pill is-sm" aria-pressed={filter === f} onClick={() => setFilter(f)}>{H.filters[f]}</button>
              ))}
            </div>
          </div>
          <p className="id-cap bnk-shown">{H.shown(nf.format(rows.length), nf.format(initial.rows.length))}</p>

          <div className="id-table-scroll">
            <table className="id-table bnk-table id-num">
              <thead>
                <tr>
                  {([['name', H.cols.bank, ''], ['type', H.cols.type, ''], ['ownership', H.cols.ownership, ''], ['status', H.cols.status, '']] as const).map(([k, label, cls]) => (
                    <th scope="col" key={k} className={cls} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                      <button type="button" className="bnk-th" onClick={() => clickSort(k)}>{label}</button>
                    </th>
                  ))}
                  <th scope="col">{H.cols.ticker}</th>
                  <th scope="col">{H.cols.publishes}</th>
                  {([['assets', H.cols.assets], ['rating', H.cols.rating]] as const).map(([k, label]) => (
                    <th scope="col" key={k} className="is-end" aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                      <button type="button" className="bnk-th" onClick={() => clickSort(k)}>{label}</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!rows.length ? <tr><td colSpan={8} className="bnk-empty">{H.noMatch}</td></tr> : rows.map((r) => {
                  const pub = r.research === 'source_unreachable' ? [H.pub.unreachable]
                    : r.research === 'not_researched' ? [H.pub.unresearched]
                    : [r.deposits ? H.pub.deposits : null, r.loans ? H.pub.loans : null, r.services.on ? H.pub.services : null].filter(Boolean) as string[]
                  return (
                    <tr key={r.slug}>
                      <td>
                        <Link href={L(`/banks/${r.slug}`)} className="bnk-name">
                          {r.logo ? <img className="bnk-logo" src={r.logo} alt="" width={28} height={28} loading="lazy" /> : <span className="bnk-logo is-blank" aria-hidden="true" />}
                          <span className="id-name">{name(r)}</span>
                        </Link>
                      </td>
                      <td>{B.type[r.type]}</td>
                      <td>{B.ownership[r.ownership]}</td>
                      <td>
                        <span className={`bnk-status is-${r.status}`}>{H.status[r.status]}</span>
                        {r.usd ? <abbr className="bnk-usd" title={H.usdLong}>$</abbr> : null}
                      </td>
                      <td>{r.ticker ? <Link href={L(`/c/${r.ticker}`)} className="id-link"><bdi>{r.ticker}</bdi></Link> : <span className="id-cap">{H.notListed}</span>}</td>
                      <td><div className="bnk-pub">{pub.length ? pub.map((p) => <span key={p} className="bnk-chip">{p}</span>) : <span className="id-cap">{H.pub.none}</span>}</div></td>
                      <td className="is-end">
                        {r.assets != null ? <><bdi>{compact(r.assets, u)}</bdi><span className="id-sub">{H.assetsNote(String(r.finYear))}</span></> : <span className="id-cap">{H.noAssets}</span>}
                      </td>
                      <td className="is-end">{r.rating ? <bdi>{r.rating.overall.toFixed(1)}<span className="id-cap">/{r.rating.outOf}</span></bdi> : <span className="id-cap">{H.notRated}</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <AboutSection title={H.about.title} body={H.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
