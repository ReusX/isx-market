'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { wrapVars } from '@/lib/wrapText'
import type { SessionWrap } from '@/lib/wrapServer'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { AboutSection } from './AboutSection'
import '@/styles/news-page.css'
import '@/styles/wrap-page.css'

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
   gate sees the guard (same pattern as the analysis index). */
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
    <table className="id-table id-num wrp-table">
      <thead><tr><th>{w.cols.company}</th><th className="is-end">{w.cols.close}</th><th className="is-end">{w.cols.change}</th><th className="is-end wrp-hide-sm">{w.cols.value}</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.sym}>
            <td><Link href={L(`/c/${r.sym}`)} className="wrp-co"><span className="id-name">{name(r)}</span><span className="id-sub"><bdi>{r.sym}</bdi></span></Link></td>
            <td className="is-end">{n2.format(r.close)}</td>
            <td className={`is-end ${cls(r.pct)}`}><bdi>{chg(r.pct)}</bdi></td>
            <td className="is-end wrp-hide-sm">{n0.format(r.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <SiteShell>
      <main className="nws id-full iq-door">
        <DoorRail door="markets" />
        <article className="art id-read wrp">
          <nav className="id-eyebrow art-crumbs" aria-label={t.news.title}>
            <Link href={L('/news')}>{t.news.title}</Link> · {ARCHIVE_HOME[locale] ? <Link href={L(ARCHIVE_HOME[locale] as string)}>{w.eyebrow}</Link> : <span>{w.eyebrow}</span>}
          </nav>
          <h1 className="id-h1 art-title">{w.h1(v.day)}</h1>
          <p className="art-standfirst">{w.standfirst}</p>
          <p className="art-meta id-cap"><span>{w.source}</span> · <time dateTime={initial.date}>{localeDate(initial.date, locale)}</time></p>

          <div className="wrp-figures id-num" aria-label={w.sections.index}>
            <div><span className="id-cap">ISX60</span><strong className={v.dir === 'up' ? 'id-up' : v.dir === 'down' ? 'id-down' : ''}>{v.close}</strong><span className={`id-cap ${v.dir === 'up' ? 'id-up' : v.dir === 'down' ? 'id-down' : ''}`}><bdi dir="ltr">{v.dir === 'up' ? '+' : v.dir === 'down' ? '−' : ''}{v.pct}%</bdi></span></div>
            <div><span className="id-cap">{w.sections.breadth}</span><strong><span className="id-up">{v.up}</span> · <span className="id-down">{v.down}</span> · {v.flat}</strong><span className="id-cap">{v.traded} / {v.listed}</span></div>
            <div><span className="id-cap">{w.cols.value}</span><strong>{v.value}</strong><span className="id-cap">{v.trades}</span></div>
            {v.foreign ? <div><span className="id-cap">{w.sections.foreign}</span><strong className={v.foreign.netDir === 'up' ? 'id-up' : v.foreign.netDir === 'down' ? 'id-down' : ''}><bdi>{v.foreign.netDir === 'up' ? '+' : v.foreign.netDir === 'down' ? '−' : ''}{v.foreign.net}</bdi></strong><span className="id-cap">{v.foreign.buy} · {v.foreign.sell}</span></div> : null}
          </div>

          <div className="art-body id-body">
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
            <p><Link href={L(`/market?date=${initial.date}`)} className="id-btn is-sm">{w.board}</Link></p>
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

/** /news/session · the archive: one row per session, newest first. */
export function SessionArchivePage({ rows }: { rows: { date: string; close: number; pct: number | null }[] }) {
  const { t, locale, href: L } = useLocale()
  const w = t.wrap
  return (
    <SiteShell>
      <main className="nws id-full iq-door">
        <DoorRail door="markets" />
        <article className="art id-read wrp">
          <nav className="id-eyebrow art-crumbs"><Link href={L('/news')}>{t.news.title}</Link> · <span>{w.eyebrow}</span></nav>
          <h1 className="id-h1 art-title">{w.archiveTitle}</h1>
          <p className="art-standfirst">{w.archiveIntro}</p>
          <ol className="wrp-archive id-num">
            {rows.map((r) => (
              <li key={r.date}>
                <Link href={L(`/news/session/${r.date}`)}>
                  <span className="wrp-archive-date">{w.weekdays[new Date(`${r.date}T00:00:00Z`).getUTCDay()]} {localeDate(r.date, locale)}</span>
                  <span className="wrp-archive-close">{n2.format(r.close)}</span>
                  {r.pct != null ? <span className={`wrp-archive-pct ${r.pct > 0.005 ? 'id-up' : r.pct < -0.005 ? 'id-down' : ''}`}><bdi>{r.pct > 0.005 ? '+' : r.pct < -0.005 ? '−' : ''}{n2.format(Math.abs(r.pct))}%</bdi></span> : <span />}
                </Link>
              </li>
            ))}
          </ol>
          <AboutSection title={w.aboutTitle} body={[w.aboutBody]} />
        </article>
      </main>
    </SiteShell>
  )
}
