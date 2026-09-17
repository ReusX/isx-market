'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { PageTitle } from './PageTitle'
import { existsIn } from '@/lib/i18n/routes'
import { KINDS, filterNews, countByKind, dayLabel, groupByDay, type KindId } from '@/lib/news'
import type { NewsInitial } from '@/lib/newsServer'
import '@/styles/news-page.css'

/**
 * /news · the feed.
 *
 * One list, newest first, grouped by day: ISC filings (a PDF on the
 * regulator's site) and the site's own articles, each row one item — the
 * kind, the headline, the company or source. Filters are pills and a
 * search; the list grows by a page at a time. Everything arrives from
 * `loadNews` on the server, so the feed is in the HTML.
 */
const PAGE = 40

export function NewsPage({ initial }: { initial: NewsInitial }) {
  const { t, locale, href: L } = useLocale()
  const nw = t.news
  const [kind, setKind] = useState<KindId>('all')
  const [sector, setSector] = useState('ALL')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)
  useEffect(() => { setShown(PAGE) }, [kind, sector, q])

  const rail = [
    { label: t.home.landing.doors.learn.links.news, route: '/news' },
    { label: t.home.landing.doors.learn.links.learn, route: '/learn', soon: true },
    { label: t.home.landing.doors.learn.links.zero, route: '/learn/trading-from-zero', soon: true },
    { label: t.home.landing.doors.learn.links.research, route: '/research', soon: true },
  ].filter((r) => r.soon || existsIn(r.route, locale))

  const filtered = useMemo(() => filterNews(initial.items, { kind, sector, query: q }), [initial.items, kind, sector, q])
  const groups = useMemo(() => groupByDay(filtered.slice(0, shown), locale), [filtered, shown, locale])
  const nf = new Intl.NumberFormat('en-US')

  return (
    <SiteShell>
      <main className="nws id-full iq-door">
        <DoorRail door="learn" />
        <div className="nws-body">
          <header className="nws-head">
            <p className="id-eyebrow">{t.home.landing.doors.learn.name}</p>
            <PageTitle title={nw.title} note={nw.standfirst} />
            {initial.filingCoverage ? (
              <p className="id-cap">{nw.coverage(nf.format(initial.filingCoverage.count), dayLabel(initial.filingCoverage.oldest, locale), dayLabel(initial.filingCoverage.newest, locale))}</p>
            ) : null}
          </header>

          {!initial.articlesOk ? <p className="id-note nws-notice"><b>{nw.articlesFailedTitle}</b> · {nw.articlesFailedNote}</p> : null}
          {!initial.filingsOk ? <p className="id-note nws-notice"><b>{nw.filingsFailedTitle}</b> · {nw.filingsFailedNote}</p> : null}

          <div className="nws-tools">
            <div className="id-pills" role="group" aria-label={nw.kindGroup}>
              {KINDS.map((k) => (
                <button key={k.id} type="button" className="id-pill is-sm" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
                  {nw.kinds[k.id]} <span className="nws-count">{nf.format(countByKind(initial.items, k.id))}</span>
                </button>
              ))}
            </div>
            {initial.sectors.length ? (
              <select className="id-input nws-sector" value={sector} onChange={(e) => setSector(e.target.value)} aria-label={nw.sectorFilter}>
                <option value="ALL">{nw.allSectors}</option>
                {initial.sectors.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            ) : null}
            <input type="search" className="id-input nws-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={nw.searchPlaceholder} aria-label={nw.searchLabel} />
          </div>
          <p className="id-cap nws-shown">{nf.format(filtered.length)} {nw.matching} {nw.ofTotal(nf.format(initial.items.length))}</p>

          {!initial.items.length ? (
            <p className="id-note"><b>{nw.emptyTitle}</b> · {nw.emptyNote}</p>
          ) : !filtered.length ? (
            <p className="id-note"><b>{q ? nw.noMatch(q) : nw.noneInFilter}</b> · {q ? nw.tryCompany : nw.tryOtherFilter}</p>
          ) : (
            <div className="nws-list">
              {groups.map((g) => (
                <section key={g.day} className="nws-day" aria-label={g.label}>
                  <h2 className="nws-day-h id-num">{g.label}</h2>
                  <ol className="nws-items">
                    {g.items.map((it) => (
                      <li key={it.id} className={`nws-item is-${it.kind}`}>
                        <span className="nws-kind">{nw.kinds[it.kind]}</span>
                        <div className="nws-main">
                          {it.external ? (
                            <a className="nws-title" href={it.href} target="_blank" rel="noopener" aria-label={it.doc ? nw.filingLink(it.doc.type, it.name ?? it.symbol ?? '', it.headline) : it.headline}>
                              {it.name ? <span className="id-name">{it.name}</span> : null}{it.name ? ' · ' : ''}{it.headline} ↗
                            </a>
                          ) : (
                            /* An article that exists in Arabic only links to the Arabic page. */
                            <Link className="nws-title" href={it.foreignLang ? it.href : L(it.href)}>{it.headline}{it.foreignLang && nw.arabicArticle ? <span className="id-cap"> · {nw.arabicArticle}</span> : null}</Link>
                          )}
                          {it.excerpt ? <p className="nws-excerpt id-cap">{it.excerpt}</p> : null}
                          <p className="nws-meta id-cap">
                            {it.symbol ? <Link href={L(`/c/${it.symbol}`)} className="id-link"><bdi>{it.symbol}</bdi></Link> : null}
                            {it.symbol ? ' · ' : ''}{it.source}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
              {shown < filtered.length ? (
                <p className="nws-more"><button type="button" className="id-btn is-sm" onClick={() => setShown((n) => n + PAGE)}>{nw.showMore}</button></p>
              ) : <p className="id-cap nws-end">{nw.endOfList(nf.format(filtered.length))}</p>}
            </div>
          )}
        </div>
      </main>
    </SiteShell>
  )
}
