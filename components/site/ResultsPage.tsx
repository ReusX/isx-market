'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { periodLabel } from '@/lib/news'
import { resultsVars, money, cmp } from '@/lib/resultsText'
import { existsIn } from '@/lib/i18n/routes'
import type { Results } from '@/lib/resultsServer'
import { SiteShell } from './SiteShell'
import { DoorRail } from './DoorRail'
import { AboutSection } from './AboutSection'
import '@/styles/news-page.css'
import '@/styles/wrap-page.css'
import '@/styles/econ-page.css'
import '@/styles/markets.css'
import '@/styles/financials-page.css'

/**
 * /c/[sym]/results/[period] · one filing, written out.
 *
 * On the board (identity v3): net profit as the figure with its change
 * against the same period a year earlier, the other headline figures and
 * the documents as the key card. Then the result written out — each a
 * paragraph from the `results` dictionary — the key figures as a board
 * table, and the company's other filings as chips.
 */
const RESULTS_HOME: Record<string, string | null> = { ar: '/c', en: null }

export function ResultsPage({ initial }: { initial: Results }) {
  const { t, locale, href: L } = useLocale()
  const r = t.results
  const v = resultsVars(initial, t, locale)
  const rows = (['net_income', 'pretax_income', 'revenue', 'operating_income', 'total_assets', 'total_equity', 'customer_deposits', 'islamic_financing', 'cash', 'paid_capital'] as const)
    .filter((k) => initial.now[k] != null)
    .map((k) => ({ k, label: k === 'revenue' && initial.template === 'bank' ? r.lines.revenue_bank : r.lines[k], now: initial.now[k] as number, prior: initial.prior?.[k], c: cmp(initial.now[k], initial.prior?.[k]) }))
  const paras = [r.headline(v), r.revenue(v), r.balance(v), r.ratios(v), r.source(v)].filter(Boolean)
  const sign = (d: 'up' | 'down' | 'flat') => (d === 'up' ? '+' : d === 'down' ? '−' : '')
  /* «53.9 مليار» → the figure and its unit, so the unit goes on the line. */
  const [, netNum = v.net, netUnit = ''] = v.net.match(/^(\S+)\s+(.+)$/) ?? []
  const cls = (d: 'up' | 'down' | 'flat') => (d === 'up' ? 'id-up' : d === 'down' ? 'id-down' : '')

  return (
    <SiteShell>
      <main className="nws id-full iq-door" data-world="lapis" data-level="calm">
        <DoorRail door="markets" />
        <article className="wrp rs">
          <div className="fx-frame fin-frame">
            <div className="fx-board">
              <div className="fx-lead">
                <nav className="id-cap fin-crumbs">
                  <Link href={L('/news')}>{t.news.title}</Link> · <span>{r.eyebrow}</span> · <Link href={L(`/c/${initial.key.sym}`)}><bdi>{initial.key.sym}</bdi></Link>
                </nav>
                <h1 className="rs-title">{r.h1(v)}</h1>
                <p className={`fx-huge id-num ${v.netDir === 'down' && v.net.startsWith('−') ? 'fin-neg' : ''}`.trim()}>
                  <span className="fx-huge-num">
                    <bdi dir="ltr">{netNum}</bdi>
                    <svg className="fx-swoosh" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M4 30 C 50 10, 110 4, 196 20" pathLength={1} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </span>
                </p>
                <p className="fx-line">
                  {v.netYoY ? <span className={`id-chg ${v.netYoY.dir === 'up' ? 'is-up' : v.netYoY.dir === 'down' ? 'is-down' : 'is-flat'}`} title={r.board.vsYear}><bdi dir="ltr">{sign(v.netYoY.dir)}{v.netYoY.pct}{v.netYoY.pct ? '%' : ''}</bdi></span> : null}
                  <span>{r.board.netLine(netUnit, v.periodLabel, v.year)}{v.netYoY ? ` · ${r.board.vsYear}` : ''}</span>
                </p>
                <p className="fx-chart-note">{r.standfirst}</p>
                <p className="fx-chart-note"><span>{r.sourceName}</span>{initial.addedAt ? <> · <time dateTime={initial.addedAt}>{localeDate(initial.addedAt.slice(0, 10), locale)}</time></> : null}</p>
              </div>

              <section className="id-print is-key fx-calc" aria-label={r.sections.table}>
                <h2 className="fx-calc-title">{r.sections.table}</h2>
                <ul className="fin-keys id-num">
                  {v.revenue ? <li><small>{initial.template === 'bank' ? r.lines.revenue_bank : r.lines.revenue}</small><b><bdi>{v.revenue}</bdi></b>{v.revenueYoY ? <span className={`id-chg ${v.revenueYoY.dir === 'up' ? 'is-up' : v.revenueYoY.dir === 'down' ? 'is-down' : 'is-flat'}`}><bdi dir="ltr">{sign(v.revenueYoY.dir)}{v.revenueYoY.pct}{v.revenueYoY.pct ? '%' : ''}</bdi></span> : <span />}</li> : null}
                  {v.assets ? <li><small>{r.lines.total_assets}</small><b><bdi>{v.assets}</bdi></b>{v.assetsYoY ? <span className={`id-chg ${v.assetsYoY.dir === 'up' ? 'is-up' : v.assetsYoY.dir === 'down' ? 'is-down' : 'is-flat'}`}><bdi dir="ltr">{sign(v.assetsYoY.dir)}{v.assetsYoY.pct}{v.assetsYoY.pct ? '%' : ''}</bdi></span> : <span />}</li> : null}
                  {v.roe ? <li><small>ROE</small><b><bdi>{v.roe}%</bdi></b><span /></li> : null}
                  {v.eps ? <li><small>EPS</small><b><bdi>{v.eps}</bdi></b><span /></li> : null}
                </ul>
                <div className="fx-quick rs-docs">
                  {initial.pdfUrl ? <a className="fx-qbtn" href={initial.pdfUrl} target="_blank" rel="noopener">{r.pdf} ↗</a> : null}
                  <Link className="fx-qbtn" href={L(`/c/${initial.key.sym}/financials`)}>{r.allFinancials}</Link>
                  <Link className="fx-qbtn" href={L(`/c/${initial.key.sym}`)}>{r.companyPage}</Link>
                </div>
              </section>
            </div>
          </div>

          <div className="art-body id-body id-read rs-body">
            <h2>{r.sections.headline}</h2>
            {paras.map((p, i) => <p key={i}>{p}</p>)}
            <h2>{r.sections.table}</h2>
            <p className="id-cap">{r.yoyNote}</p>
            <div className="mb-scroll id-table-scroll"><table className="mb-table id-num wrp-table rs-table">
              <thead><tr><th>{r.cols.line}</th><th className="is-end">{r.cols.now}</th><th className="is-end wrp-hide-sm">{r.cols.prior}</th><th className="is-end">{r.cols.change}</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.k}>
                    <td>{row.label}</td>
                    <td className="is-end"><bdi>{money(row.now, r)}</bdi></td>
                    <td className="is-end wrp-hide-sm">{row.prior != null ? <bdi>{money(row.prior, r)}</bdi> : '—'}</td>
                    <td className={`is-end ${row.c ? cls(row.c.dir) : ''}`}>{row.c ? <bdi dir="ltr">{sign(row.c.dir)}{row.c.pct}{row.c.pct ? '%' : ''}</bdi> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            {initial.siblings.length > 1 && RESULTS_HOME[locale] ? (
              <>
                <h2>{r.sections.filings}</h2>
                <p className="wrp-siblings fx-quick">
                  {initial.siblings.map((s) => s.slug === initial.slug
                    ? <span key={s.slug} className="fx-qbtn" aria-current="page" aria-pressed="true">{periodLabel(s.period, locale)} {s.year}</span>
                    : <Link key={s.slug} className="fx-qbtn" href={L(`${RESULTS_HOME[locale]}/${s.sym}/results/${s.slug}`)}>{periodLabel(s.period, locale)} {s.year}</Link>)}
                </p>
              </>
            ) : null}
          </div>
          <AboutSection title={r.aboutTitle} body={[r.aboutBody]} />
        </article>
      </main>
    </SiteShell>
  )
}
