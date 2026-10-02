'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { wrapVars } from '@/lib/wrapText'
import type { SessionWrap } from '@/lib/wrapServer'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { AboutSection } from './AboutSection'
import { MiniArea } from './MiniArea'
import '@/styles/news-page.css'
import '@/styles/wrap-page.css'
import '@/styles/econ-page.css'
import '@/styles/markets.css'
import '@/styles/financials-page.css'

/**
 * /news/session/[date] · one trading day, written out.
 *
 * Reads like a short market report — index, breadth and liquidity, movers,
 * foreign investors — and every sentence is a function of the day's
 * figures (lib/wrapText + the `wrap` dictionary). Two small tables carry
 * what prose carries badly: the five biggest moves each way and the most
 * traded names. Links to the session's board and to the neighbours.
 */
const n2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const n0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
/* The wrap exists in Arabic only; resolved per locale so the static link
   gate sees the guard. */
const ARCHIVE_HOME: Record<string, string | null> = { ar: '/news/session', en: null }

export function SessionWrapPage({ initial }: { initial: SessionWrap }) {
  const { t, locale, href: L } = useLocale()
  const w = t.wrap
  const v = wrapVars(initial, t, locale)
  const name = (m: { ar: string; en: string }) => (locale === 'ar' ? m.ar : m.en)
  const chg = (pct: number) => `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${n2.format(Math.abs(pct))}%`
  const cls = (pct: number) => (pct > 0 ? 'id-up' : pct < 0 ? 'id-down' : '')
  const paras = [w.index(v), w.context(v)].filter(Boolean)

  const movers = (rows: SessionWrap['gainers']) => (
    <div className="mb-scroll id-table-scroll"><table className="mb-table id-num wrp-table">
      <thead><tr><th>{w.cols.company}</th><th className="is-end">{w.cols.close}</th><th className="is-end">{w.cols.change}</th><th className="is-end wrp-hide-sm">{w.cols.value}</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.sym}>
            <td><Link href={L(`/c/${r.sym}`)} className="mb-co"><span className="mb-co-text"><b>{name(r)}</b><small>{r.sym}</small></span></Link></td>
            <td className="is-end">{n2.format(r.close)}</td>
            <td className="is-end"><span className={`id-chg ${r.pct > 0 ? 'is-up' : r.pct < 0 ? 'is-down' : 'is-flat'}`}><bdi dir="ltr">{chg(r.pct)}</bdi></span></td>
            <td className="is-end wrp-hide-sm">{n0.format(r.value)}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
  )

  return (
    <SiteShell>
      <main className="nws id-full iq-door" data-world="lapis" data-level="calm">
        <DoorRail door="markets" />
        <article className="wrp na-body">
          {/* Identity v3: the ISX60 close as the figure with its move, the
              day's breadth, value and foreign flow as the key card; the
              report follows in one reading column. */}
          <div className="fx-frame fin-frame">
            <div className="fx-board">
              <div className="fx-lead">
                <nav className="id-cap fin-crumbs" aria-label={t.news.title}>
                  <Link href={L('/news')}>{t.news.title}</Link> · {ARCHIVE_HOME[locale] ? <Link href={L(ARCHIVE_HOME[locale] as string)}>{w.eyebrow}</Link> : <span>{w.eyebrow}</span>}
                </nav>
                <h1 className="na-title wr-title">{w.h1(v.day)}</h1>
                <p className={`fx-huge id-num ${v.dir === 'down' ? 'wr-down' : v.dir === 'up' ? 'wr-up' : ''}`.trim()}>
                  <span className="fx-huge-num">
                    <bdi dir="ltr">{v.close}</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                </p>
                <p className="fx-line">
                  <span className={`id-chg ${v.dir === 'up' ? 'is-up' : v.dir === 'down' ? 'is-down' : 'is-flat'}`}><bdi dir="ltr">{v.dir === 'up' ? '+' : v.dir === 'down' ? '−' : ''}{v.pct}%</bdi></span>
                  <span>{w.v3.index} · <time dateTime={initial.date}>{localeDate(initial.date, locale)}</time></span>
                </p>
                <p className="fx-chart-note">{w.standfirst}</p>
                <p className="fx-chart-note">{w.source}</p>
              </div>

              <section className="id-print is-key fx-calc" aria-label={w.v3.key}>
                <h2 className="fx-calc-title">{w.v3.key}</h2>
                <ul className="fin-keys id-num">
                  <li><small>{w.sections.breadth}</small><b><span className="id-up">{v.up}</span> · <span className="id-down">{v.down}</span> · {v.flat}</b><em className="wr-sub">{v.traded} / {v.listed}</em></li>
                  <li><small>{w.cols.value}</small><b>{v.value}</b><em className="wr-sub">{v.trades}</em></li>
                  {v.foreign ? <li><small>{w.sections.foreign}</small><b className={v.foreign.netDir === 'up' ? 'id-up' : v.foreign.netDir === 'down' ? 'id-down' : ''}><bdi>{v.foreign.netDir === 'up' ? '+' : v.foreign.netDir === 'down' ? '−' : ''}{v.foreign.net}</bdi></b><em className="wr-sub">{v.foreign.buy} · {v.foreign.sell}</em></li> : null}
                </ul>
                <p className="fx-calc-prev"><Link href={L(`/market?date=${initial.date}`)}>{w.board} ←</Link></p>
              </section>
            </div>
          </div>

          <div className="art-body id-body id-read wr-body">
            <h2>{w.sections.index}</h2>
            {paras.map((p, i) => <p key={i}>{p}</p>)}
            <h2>{w.sections.breadth}</h2>
            <p>{w.breadth(v)}</p>
            <p>{w.liquidity(v)}</p>
            <h2>{w.sections.movers}</h2>
            <p>{w.gainers(v)} {w.losers(v)}</p>
            {initial.gainers.length ? movers(initial.gainers) : null}
            {initial.losers.length ? movers(initial.losers) : null}
            <h2>{w.sections.active}</h2>
            {w.active(v) ? <p>{w.active(v)}</p> : null}
            {initial.active.length ? movers(initial.active) : null}
            <h2>{w.sections.foreign}</h2>
            <p>{w.foreign(v)}</p>
          </div>

          <nav className="art-nav" aria-label={w.archive}>
            {initial.prev ? <Link href={L(`/news/session/${initial.prev}`)} className="art-nav-a"><span className="id-cap">{w.prevSession}</span><span>{localeDate(initial.prev, locale)}</span></Link> : <span />}
            {initial.next ? <Link href={L(`/news/session/${initial.next}`)} className="art-nav-a is-next"><span className="id-cap">{w.nextSession}</span><span>{localeDate(initial.next, locale)}</span></Link> : <span />}
          </nav>
          <AboutSection title={w.aboutTitle} body={[w.aboutBody]} />
        </article>
      </main>
    </SiteShell>
  )
}

/** /news/session · the archive, on the board: the latest close as the
 *  figure with every session's close drawn, the newest wrap as the key
 *  card, then one board-table row per session, newest first. */
export function SessionArchivePage({ rows }: { rows: { date: string; close: number; pct: number | null }[] }) {
  const { t, locale, href: L } = useLocale()
  const w = t.wrap
  const V = w.v3
  const last = rows[0]
  const dir = (p: number | null) => (p == null ? 'is-flat' : p > 0.005 ? 'is-up' : p < -0.005 ? 'is-down' : 'is-flat')
  const sgn = (p: number) => (p > 0.005 ? '+' : p < -0.005 ? '−' : '')
  const series = rows.slice(0, 120).reverse().map((r) => ({ date: r.date, value: r.close }))
  const day = (d: string) => `${w.weekdays[new Date(`${d}T00:00:00Z`).getUTCDay()]} ${localeDate(d, locale)}`
  return (
    <SiteShell>
      <main className="nws id-full iq-door" data-world="lapis" data-level="calm">
        <DoorRail door="markets" />
        <article className="wrp na-body">
          {last ? (
            <div className="fx-frame fin-frame">
              <div className="fx-board">
                <div className="fx-lead">
                  <nav className="id-cap fin-crumbs"><Link href={L('/news')}>{t.news.title}</Link> · <span>{w.eyebrow}</span></nav>
                  <h1 className="na-title wr-title">{w.archiveTitle}</h1>
                  <p className={`fx-huge id-num ${dir(last.pct) === 'is-down' ? 'wr-down' : dir(last.pct) === 'is-up' ? 'wr-up' : ''}`.trim()}>
                    <span className="fx-huge-num">
                      <bdi dir="ltr">{n2.format(last.close)}</bdi>
                      <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                      </svg>
                    </span>
                  </p>
                  <p className="fx-line">
                    {last.pct != null ? <span className={`id-chg ${dir(last.pct)}`}><bdi dir="ltr">{sgn(last.pct)}{n2.format(Math.abs(last.pct))}%</bdi></span> : null}
                    <span>{V.index} · {day(last.date)}</span>
                  </p>
                  {series.length > 1 ? <MiniArea points={series} format={(v) => n2.format(v)} label={V.chart} tone="world" /> : null}
                  <p className="fx-chart-note">{V.chart}</p>
                </div>
                <section className="id-print is-key fx-calc" aria-label={V.latest}>
                  <h2 className="fx-calc-title">{V.latest}</h2>
                  <p className="fx-calc-note">{day(last.date)}</p>
                  <p className="fx-calc-out id-num"><bdi>{n0.format(rows.length)}</bdi> <span>{V.sessions}</span></p>
                  <p className="fx-calc-note">{w.archiveIntro}</p>
                  <p className="fx-calc-prev"><Link className="fx-qbtn wr-read" href={L(`/news/session/${last.date}`)}>{V.read} ←</Link></p>
                </section>
              </div>
            </div>
          ) : <h1 className="na-title">{w.archiveTitle}</h1>}

          <div className="mb-scroll id-table-scroll">
            <table className="mb-table id-num wr-arch">
              <thead><tr><th>{V.colDay}</th><th className="is-end">{V.colClose}</th><th className="is-end">{V.colChg}</th><th className="is-end"><span className="sr-only">{V.read}</span></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.date}>
                    <td><Link href={L(`/news/session/${r.date}`)} className="wr-arch-day">{day(r.date)}</Link></td>
                    <td className="is-end">{n2.format(r.close)}</td>
                    <td className="is-end">{r.pct != null ? <span className={`id-chg ${dir(r.pct)}`}><bdi dir="ltr">{sgn(r.pct)}{n2.format(Math.abs(r.pct))}%</bdi></span> : '—'}</td>
                    <td className="is-end"><Link href={L(`/news/session/${r.date}`)} className="wr-arch-go">{V.read} ←</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AboutSection title={w.aboutTitle} body={[w.aboutBody]} />
        </article>
      </main>
    </SiteShell>
  )
}
