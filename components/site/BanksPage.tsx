'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { PageTitle } from './PageTitle'
import { GradeChip, ScoreBar } from './BankScore'
import { AboutSection } from './AboutSection'
import type { BanksInitial, HubRow } from '@/lib/banksServer'
import '@/styles/econ-page.css'
import '@/styles/markets.css'
import '@/styles/banks-page.css'
import '@/styles/bank-score.css'

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
type SortKey = 'name' | 'type' | 'ownership' | 'status' | 'assets' | 'score'
type Dir = 'asc' | 'desc'
const FILTERS: Filter[] = ['all', 'commercial', 'islamic', 'investment', 'listed', 'state', 'foreign', 'publishing']
const SORTS: SortKey[] = ['name', 'type', 'ownership', 'status', 'assets', 'score']
/** The direction a column starts in when first clicked: figures descend, words ascend. */
const FIRST: Record<SortKey, Dir> = { name: 'asc', type: 'asc', ownership: 'asc', status: 'asc', assets: 'desc', score: 'desc' }
const STATUS_RANK = { operating: 0, establishment: 1, guardianship: 2, liquidation: 3 }

type Units = { tn: string; bn: string; mn: string; k: string }
function compact(v: number | null | undefined, u: Units): { n: string; unit: string } {
  if (v == null || !Number.isFinite(v)) return { n: '—', unit: '' }
  const a = Math.abs(v)
  if (a >= 1e12) return { n: (a / 1e12).toFixed(2), unit: u.tn }
  if (a >= 1e9) return { n: (a / 1e9).toFixed(0), unit: u.bn }
  if (a >= 1e6) return { n: (a / 1e6).toFixed(0), unit: u.mn }
  return { n: new Intl.NumberFormat('en-US').format(a), unit: '' }
}

/* The evergreen guide; Arabic-only, so the English hub links to the Arabic URL. */
const GUIDES = {
  banks: '/news/%d8%a3%d9%81%d8%b6%d9%84-%d8%a7%d9%84%d8%a8%d9%86%d9%88%d9%83-%d9%81%d9%8a-%d8%a7%d9%84%d8%b9%d8%b1%d8%a7%d9%82',
  cards: '/news/%d8%a3%d9%81%d8%b6%d9%84-%d8%a8%d8%b7%d8%a7%d9%82%d8%a7%d8%aa-%d8%a7%d9%84%d8%af%d9%81%d8%b9-%d8%a7%d9%84%d8%a5%d9%84%d9%83%d8%aa%d8%b1%d9%88%d9%86%d9%8a-%d9%81%d9%8a-%d8%a7%d9%84%d8%b9%d8%b1%d8%a7%d9%82',
  pension: '/news/%d8%aa%d8%ad%d8%af%d9%8a%d8%ab-%d8%a8%d9%8a%d8%a7%d9%86%d8%a7%d8%aa-%d8%a7%d9%84%d9%85%d8%aa%d9%82%d8%a7%d8%b9%d8%af%d9%8a%d9%86',
}

export function BanksPage({ initial }: { initial: BanksInitial }) {
  const { t, locale, href: L } = useLocale()
  const B = t.banks
  const H = B.hub
  const W = H.board
  const S = B.score
  const u = t.site.units
  const ar = locale === 'ar'
  const name = (r: { ar: string; en: string }) => (ar ? r.ar : r.en || r.ar)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: 'score', dir: 'desc' })

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
    if (sort.key !== 'score' || sort.dir !== 'desc') { sp.set('sort', sort.key); if (sort.dir !== FIRST[sort.key]) sp.set('dir', sort.dir) }
    if (q.trim()) sp.set('q', q.trim())
    const qs = sp.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  }, [filter, sort, q])

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
      case 'assets': return list.sort(num((r) => r.assets))
      default: return list.sort(num((r) => r.score?.score ?? null))
    }
  }, [initial.rows, q, filter, sort, ar]) // eslint-disable-line react-hooks/exhaustive-deps

  const c = initial.counts
  const nf = new Intl.NumberFormat('en-US')

  return (
    <SiteShell>
      <main className="bnk id-full iq-door" data-world="tile" data-level="accent">
        <DoorRail door="banking" />
        <div className="bnk-body">
          <p className="id-eyebrow fx-crumb">{H.eyebrow}</p>
          <div className="fx-frame">
            <div className="fx-board">
              <div className="fx-lead">
                <header className="fx-head">
                  <PageTitle title={H.title} note={H.note} className="fx-title" />
                </header>
                <p className="fx-huge id-num">
                  <span className="fx-huge-num">
                    <bdi>{c.total}</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                </p>
                <p className="fx-line"><span>{W.unit} · {W.line(String(c.listed))}</span></p>
                <p className="bh-guides"><span className="id-cap">{H.guides}</span> <Link href={GUIDES.banks} hrefLang="ar">{H.guideBanks}</Link> · <Link href={GUIDES.cards} hrefLang="ar">{H.guideCards}</Link> · <Link href={GUIDES.pension} hrefLang="ar">{H.guidePension}</Link></p>
              </div>
              {initial.deposits.length ? (
                <section className="id-print is-key fx-calc" aria-label={W.keyTitle}>
                  <PageTitle as="h2" className="fx-calc-title" title={W.keyTitle} note={H.depositsNote} />
                  <ol className="bh-keys id-num">
                    {initial.deposits.slice(0, 5).map((d) => (
                      <li key={`${d.slug}-${d.nameEn}`}>
                        <span>
                          <Link href={L(`/banks/${d.slug}`)}>{name(d)}</Link>
                          <small>{d.islamic ? H.expected : H.perYear}{d.termMonths ? ` · ${H.months(String(d.termMonths))}` : ''}{d.currency !== 'IQD' ? ` · ${d.currency}` : ''}</small>
                        </span>
                        <b><bdi>{d.rate}{d.rateTo != null ? `–${d.rateTo}` : ''}%</bdi></b>
                      </li>
                    ))}
                  </ol>
                  <p className="fx-calc-prev"><Link href={L('/banks/deposits')}>{W.keyAll}</Link> · <Link href={L('/banks/loans')}>{W.keyLoans}</Link></p>
                </section>
              ) : null}
            </div>
          </div>

          <div className="fx-facts id-num bh-facts">
            {([
              [W.usdHead(String(c.usd)), W.usdPocket, H.about.body[1], <path key="u" d="M32 10v44M42 18c-2-4-6-6-10-6-6 0-10 3-10 8 0 11 21 7 21 18 0 5-5 8-11 8-5 0-9-2-11-6M12 52L52 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />],
              [W.guardHead(String(c.guardianship + c.liquidation)), W.guardPocket, H.about.body[0], <path key="g" d="M32 8l20 8v14c0 13-9 22-20 26-11-4-20-13-20-26V16zM24 32l6 6 11-12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />],
              [W.pubHead(String(c.publishing)), W.pubPocket, H.about.body[2], <path key="p" d="M16 8h24l10 10v38H16zM40 8v10h10M23 30h20M23 38h20M23 46h12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />],
            ] as const).map(([head, pocket, more, ill]) => (
              <section key={head[1] + head[2]} className="id-print is-calm fx-fact">
                <svg className="fx-ill" viewBox="0 0 64 64" aria-hidden="true">{ill}</svg>
                <h3 className="fx-fact-head">{head[0]}<em><bdi>{head[1]}</bdi></em>{head[2]}</h3>
                <p className="fx-pocket">{pocket}</p>
                <details className="fx-more"><summary aria-label={W.more}>+</summary><p>{more}</p></details>
              </section>
            ))}
          </div>

          <h2 className="id-h3 bh-all">{W.all}</h2>
          <div className="bh-tools">
            <input type="search" className="id-input bnk-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={H.search} aria-label={H.search} />
            <div className="fx-quick" role="group" aria-label={B.filterGroup}>
              {FILTERS.map((f) => (
                <button key={f} type="button" className="fx-qbtn" aria-pressed={filter === f} onClick={() => setFilter(f)}>{H.filters[f]}</button>
              ))}
            </div>
          </div>
          <div className="bh-sortline">
            <p className="id-cap">{H.shown(nf.format(rows.length), nf.format(initial.rows.length))}</p>
          </div>

          <div className="mb-scroll id-print is-calm mb-panel">
            <table className="mb-table mb-board bh-table id-num">
              <thead>
                <tr>
                  {([['name', H.cols.bank, ''], ['score', S.col, ''], ['assets', H.cols.assets, 'mb-hide-sm']] as const).map(([k, label, cls]) => {
                    const on = sort.key === k
                    return (
                      <th key={k} className={cls || undefined} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" className={`iqm-sort ${on ? 'is-on' : ''}`.trim()} onClick={() => setSort((x) => x.key === k ? { key: k, dir: x.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: FIRST[k] })}>
                          {label}<span className="iqm-sort-arrow" aria-hidden="true">{on ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                        </button>
                      </th>
                    )
                  })}
                  <th className="mb-hide-sm">{H.cols.ticker}</th>
                  <th className="mb-hide-md">{H.cols.publishes}</th>
                </tr>
              </thead>
              <tbody>
                {!rows.length ? <tr><td colSpan={5} className="bnk-empty">{H.noMatch}</td></tr> : rows.map((r) => {
                  const pub = r.research === 'source_unreachable' ? [H.pub.unreachable]
                    : r.research === 'not_researched' ? [H.pub.unresearched]
                    : [r.deposits ? H.pub.deposits : null, r.loans ? H.pub.loans : null, r.services.on ? H.pub.services : null].filter(Boolean) as string[]
                  const a = r.assets != null ? compact(r.assets, u) : null
                  return (
                    <tr key={r.slug}>
                      <td>
                        <Link href={L(`/banks/${r.slug}`)} className="mb-co">
                          {r.logo ? <img className="iqm-logo bh-logo" src={r.logo} alt="" width={32} height={32} loading="lazy" /> : <span className="iqm-logo bh-logo is-blank" aria-hidden="true" />}
                          <span className="mb-co-text">
                            <span className="mb-name"><b>{name(r)}</b>
                              {r.status !== 'operating' ? <span className={`bh-flag is-${r.status}`}>{H.status[r.status]}</span> : null}
                              {r.usd ? <span className="bh-flag is-usd" title={H.usdLong}>{H.usdShort}</span> : null}
                            </span>
                            <small>{B.type[r.type]} · {B.ownership[r.ownership]}</small>
                          </span>
                        </Link>
                      </td>
                      <td className="bh-score">
                        <GradeChip s={r.ticker ? r.score : undefined} compact />
                        {r.score?.score != null ? <ScoreBar v={r.score.score} /> : null}
                      </td>
                      <td className="mb-hide-sm">{a ? <><span className="bh-fig2"><bdi dir="ltr">{a.n}</bdi> {a.unit}</span><span className="id-sub bh-sub">{H.assetsNote(String(r.finYear))}</span></> : <span className="id-cap">—</span>}</td>
                      <td className="mb-hide-sm">{r.ticker ? <Link href={L(`/c/${r.ticker}`)} className="id-link"><bdi>{r.ticker}</bdi></Link> : <span className="id-cap">{H.notListed}</span>}</td>
                      <td className="mb-hide-md"><div className="br-meta bh-pub">{pub.length ? pub.map((x) => <span key={x}>{x}</span>) : <span>{H.pub.none}</span>}</div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="id-cap bh-note">{S.disclaimer}</p>

          <AboutSection title={S.method.title} body={S.method.body} />
          <AboutSection title={H.about.title} body={H.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
