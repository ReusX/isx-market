'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import Link from 'next/link'
import {
  KINDS, filterNews, groupByDay, countByKind, timeLabel, dayLabel,
  type KindId, type NewsItem, type ItemKind,
} from '@/lib/news'
import '@/styles/panels.css'
import '@/styles/news.css'

/**
 * أخبار السوق — the market event log.
 *
 * A direct port of `/Users/amed/iqwealth-design/app/news/NewsFeed.tsx`. The
 * composition is the reference's: a dense feed grouped by day under a sticky
 * date header, where every row answers what kind, when, what, which company
 * and from whom in one line — and a filing announces that it opens a PDF on
 * the regulator's host BEFORE the click, rather than after it.
 *
 * What differs, and why:
 *
 *   · TWO KINDS, NOT THREE. There is no capital-actions table in this
 *     database, so that kind is absent rather than proxied. The page does not
 *     mention it; a feed that spends a banner on what it does not have is
 *     worse than one that simply shows what it does.
 *   · REAL PARTIAL FAILURE. The reference simulates it with a state picker.
 *     Here the two streams are genuinely separate hosts and either can fail,
 *     so the flags come from the loader.
 *   · FILING COVERAGE, ON DEMAND. The filing index reaches back to 2021 but
 *     stops short of the current session, so selecting إفصاحات — the one
 *     state that depends on knowing the window — prints it. Nowhere else.
 *   · NO THEME TOGGLE, NO STATE PICKER. Design-app furniture.
 */

const PAGE = 25

type Props = {
  items: NewsItem[]
  sectors: { id: string; label: string }[]
  articlesOk: boolean
  filingsOk: boolean
  filingCoverage: { count: number; oldest: string; newest: string } | null
}

export function NewsClient({ items, sectors, articlesOk, filingsOk, filingCoverage }: Props) {
  const { t: T, locale, href: L } = useLocale()
  const nw = T.news
  const [kind, setKind] = useState<KindId>('all')
  const [sector, setSector] = useState<string>('ALL')
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)

  const filtered = useMemo(
    () => filterNews(items, { kind, sector, query }),
    [items, kind, sector, query])
  const groups = useMemo(() => groupByDay(filtered.slice(0, shown), locale), [filtered, shown, locale])

  const filtering = kind !== 'all' || sector !== 'ALL' || query.trim() !== ''
  function reset() { setKind('all'); setSector('ALL'); setQuery(''); setShown(PAGE) }

  const oldest = items.length ? items[items.length - 1].at : null
  // One stream down while the other is up. Both down is the empty state.
  const degraded = items.length > 0 && (!articlesOk || !filingsOk)

  return (
    <main className="nw-page iq-page">
      {/* ── Header · compact, then straight into the controls ────────────── */}
      <header className="nw-head">
        <div className="st-title">
          <h1>{nw.title}</h1>
          <p>
            {nw.standfirst}
            {/* The date is NOT bdi-wrapped. An Arabic date carries Arabic
                words AND Latin numerals, so isolating the whole run reorders
                it — the reference prints «منذ ايار 2026 30» for exactly this
                reason. Only the pure figure beside it is isolated. */}
            {items.length ? <> · {nw.itemsSince(String(items.length), dayLabel(oldest!, locale))}</> : null}
          </p>
        </div>
      </header>

      {/* ── Controls · type, search, sector ──────────────────────────────── */}
      <div className="nw-controls">
        <div className="st-switch nw-kinds" role="group" aria-label={nw.kindGroup}>
          {KINDS.map(k => (
            <button key={k.id} type="button" className={kind === k.id ? 'active' : ''}
              aria-pressed={kind === k.id}
              onClick={() => { setKind(k.id); setShown(PAGE) }}>
              {nw.kinds[k.id]}
              <bdi className="nw-kind-n">{countByKind(items, k.id)}</bdi>
            </button>
          ))}
        </div>

        <label className="nw-mv-search nw-search">
          <span className="sr-only">{nw.searchLabel}</span>
          <input
            type="search" value={query}
            onChange={e => { setQuery(e.target.value); setShown(PAGE) }}
            placeholder={nw.searchFull}
            aria-label={nw.searchFull} />
        </label>

        <label className="nw-mv-select nw-sector">
          <span className="sr-only">{nw.sector}</span>
          <select value={sector} onChange={e => { setSector(e.target.value); setShown(PAGE) }}
            aria-label={nw.sectorFilter}>
            <option value="ALL">{nw.allSectors}</option>
            {sectors.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {/* ── Active filters + result count ───────────────────────────────── */}
      <div className="nw-status">
        <span className="nw-count">
          <bdi>{filtered.length}</bdi>
          {' '}{filtering ? nw.matching : nw.items}
          {filtered.length !== items.length ? <> {nw.ofTotal(String(items.length))}</> : null}
        </span>
        {filtering ? (
          <>
            {kind !== 'all' ? (
              <button type="button" className="nw-chip" onClick={() => setKind('all')}>
                {nw.kinds[kind]} <i aria-hidden="true">×</i>
                <span className="sr-only">{nw.removeKind}</span>
              </button>
            ) : null}
            {sector !== 'ALL' ? (
              <button type="button" className="nw-chip" onClick={() => setSector('ALL')}>
                {sectors.find(s => s.id === sector)?.label ?? sector} <i aria-hidden="true">×</i>
                <span className="sr-only">{nw.removeSector}</span>
              </button>
            ) : null}
            {query.trim() ? (
              <button type="button" className="nw-chip" onClick={() => setQuery('')}>
                «{query.trim()}» <i aria-hidden="true">×</i>
                <span className="sr-only">{nw.clearSearch}</span>
              </button>
            ) : null}
            <button type="button" className="nw-reset" onClick={reset}>{nw.reset}</button>
          </>
        ) : null}
        {degraded ? (
          <span className="nw-degraded">
            {!articlesOk ? nw.articlesDown : nw.filingsDown}
          </span>
        ) : null}
      </div>

      {degraded ? (
        <div className="mv-error nw-error" role="alert">
          <span className="mv-error-mark" aria-hidden="true">!</span>
          <div>
            {!articlesOk ? (
              <>
                <strong>{nw.articlesFailedTitle}</strong>
                <p>{nw.articlesFailedNote}</p>
              </>
            ) : (
              <>
                <strong>{nw.filingsFailedTitle}</strong>
                <p>{nw.filingsFailedNote}</p>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* The window the filing index actually covers. Shown only when the
          reader has selected إفصاحات, because that is the only state in which
          it changes how the list should be read. */}
      {kind === 'filing' && filingCoverage ? (
        <p className="nw-coverage">
          {nw.coverage(String(filingCoverage.count), dayLabel(filingCoverage.oldest, locale), dayLabel(filingCoverage.newest, locale))}
        </p>
      ) : null}

      {/* ── The feed ────────────────────────────────────────────────────── */}
      {!filtered.length ? (
        <div className="cd-nodata cd-nodata-wide nw-empty">
          {!items.length ? (
            <>
              <strong>{nw.emptyTitle}</strong>
              <p>{nw.emptyNote}</p>
            </>
          ) : (
            <>
              <strong>
                {query.trim()
                  ? <>{nw.noMatch(query.trim())}</>
                  : nw.noneInFilter}
              </strong>
              <p>
                {query.trim()
                  ? nw.tryCompany
                  : nw.tryOtherFilter}
              </p>
              <button type="button" className="nw-reset nw-reset-lg" onClick={reset}>{nw.reset}</button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="nw-feed">
            {groups.map(g => (
              <section key={g.day} className="nw-group" aria-label={g.label}>
                {/* Sticky, so the date a row belongs to is never off-screen. */}
                <h2 className="nw-day">{g.label}</h2>
                <ul className="nw-rows">
                  {g.items.map(it => <Row key={it.id} item={it} query={query} />)}
                </ul>
              </section>
            ))}
          </div>
          {shown < filtered.length ? (
            <button type="button" className="nw-more" onClick={() => setShown(s => s + PAGE)}>
              {nw.showMore}
              <bdi>{Math.min(PAGE, filtered.length - shown)}</bdi>
            </button>
          ) : (
            <p className="nw-end">
              {nw.endOfList(String(filtered.length))}
            </p>
          )}
        </>
      )}
    </main>
  )
}

/* ── One row ──────────────────────────────────────────────────────────────
   Type · time · headline · company · source · document. A filing and an
   article share a skeleton so the eye can scan a column, but never share a
   look: the type mark and the document line keep them apart. */
function Row({ item, query }: { item: NewsItem; query: string }) {
  const { t: T, locale } = useLocale()
  const nw = T.news
  // A ticker search matches the COMPANY, not the headline, so highlighting
  // only the headline leaves results on screen with nothing marked and the
  // reader wondering what matched — mark whichever field hit.
  const q = query.trim().toLowerCase()
  const coHit = !!q && (
    (item.symbol?.toLowerCase().includes(q) ?? false) ||
    (item.name?.toLowerCase().includes(q) ?? false))
  const srcHit = !!q && item.source.toLowerCase().includes(q)

  const body = (
    <>
      <span className="nw-mark" aria-hidden="true">{item.kind === 'filing' ? '◫' : '▸'}</span>

      <time className="nw-time" dateTime={item.at}>{timeLabel(item.at)}</time>

      <span className="nw-body">
        <span className="nw-kind-label">{nw.kinds[item.kind]}</span>
        <strong className="nw-headline">
          {highlight(item.headline, query)}
          {/* Marked, not hidden: the article is real and current, and the
              reader is told which language it opens in before they click. */}
          {item.foreignLang && nw.arabicArticle
            ? <span className="nw-lang" lang="ar-IQ" dir="auto">{nw.arabicArticle}</span>
            : null}
        </strong>
        {item.excerpt ? <span className="nw-excerpt">{item.excerpt}</span> : null}
        <span className="nw-meta">
          <span className={`nw-source${srcHit ? ' is-hit' : ''}`}>{highlight(item.source, query)}</span>
          {item.doc ? (
            <>
              <span className="nw-sep">·</span>
              <span className="nw-doc">
                <i aria-hidden="true">PDF</i>
                {item.doc.type}
              </span>
            </>
          ) : null}
        </span>
      </span>

      {item.symbol ? (
        <span className={`nw-co${coHit ? ' is-hit' : ''}`}>
          <span className="nw-co-name" title={item.name ?? ''}>{highlight(item.name ?? '', query)}</span>
          <bdi className="cd-ticker">{item.symbol}</bdi>
        </span>
      ) : (
        <span className="nw-co nw-co-market"><span>{nw.market}</span></span>
      )}

      <span className="nw-go" aria-hidden="true">{item.external ? '↗' : '‹'}</span>
    </>
  )

  return (
    <li className={`nw-row is-${item.kind}`}>
      {item.external ? (
        <a href={item.href} target="_blank" rel="noopener noreferrer"
          aria-label={nw.filingLink(nw.kinds[item.kind], item.name ?? '', item.headline)}>
          {body}
        </a>
      ) : (
        <Link href={item.href} aria-label={`${nw.kinds[item.kind]}: ${item.headline}`}>{body}</Link>
      )}
    </li>
  )
}

/** Marks the matched substring so «what matched» is never a guess. */
function highlight(text: string, query: string) {
  const q = query.trim()
  if (!q) return text
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}
