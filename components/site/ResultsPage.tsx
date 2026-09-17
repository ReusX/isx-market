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

/**
 * /c/[sym]/results/[period] · one filing, written out.
 *
 * The result, the income lines, the balance sheet, the derived indicators —
 * each a paragraph from the `results` dictionary — then one table of the
 * key figures against the same period a year earlier, the original PDF,
 * and the company's other filings.
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
  const cls = (d: 'up' | 'down' | 'flat') => (d === 'up' ? 'id-up' : d === 'down' ? 'id-down' : '')

  return (
    <SiteShell>
      <main className="nws id-full iq-door">
        <DoorRail door="markets" />
        <article className="art id-read wrp">
          <nav className="id-eyebrow art-crumbs">
            <Link href={L('/news')}>{t.news.title}</Link> · <span>{r.eyebrow}</span> · <Link href={L(`/c/${initial.key.sym}`)}><bdi>{initial.key.sym}</bdi></Link>
          </nav>
          <h1 className="id-h1 art-title">{r.h1(v)}</h1>
          <p className="art-standfirst">{r.standfirst}</p>
          <p className="art-meta id-cap"><span>{r.sourceName}</span>{initial.addedAt ? <> · <time dateTime={initial.addedAt}>{localeDate(initial.addedAt.slice(0, 10), locale)}</time></> : null}</p>

          <div className="wrp-figures id-num">
            <div><span className="id-cap">{r.lines.net_income}</span><strong className={cls(v.netYoY?.dir ?? (v.net.startsWith('−') ? 'down' : 'flat'))}><bdi>{v.net}</bdi></strong>{v.netYoY ? <span className={`id-cap ${cls(v.netYoY.dir)}`}><bdi dir="ltr">{sign(v.netYoY.dir)}{v.netYoY.pct}%</bdi></span> : <span className="id-cap">{v.year}</span>}</div>
            {v.revenue ? <div><span className="id-cap">{initial.template === 'bank' ? r.lines.revenue_bank : r.lines.revenue}</span><strong><bdi>{v.revenue}</bdi></strong>{v.revenueYoY ? <span className={`id-cap ${cls(v.revenueYoY.dir)}`}><bdi dir="ltr">{sign(v.revenueYoY.dir)}{v.revenueYoY.pct}%</bdi></span> : <span />}</div> : null}
            {v.assets ? <div><span className="id-cap">{r.lines.total_assets}</span><strong><bdi>{v.assets}</bdi></strong>{v.assetsYoY ? <span className={`id-cap ${cls(v.assetsYoY.dir)}`}><bdi dir="ltr">{sign(v.assetsYoY.dir)}{v.assetsYoY.pct}%</bdi></span> : <span />}</div> : null}
            {v.roe ? <div><span className="id-cap">ROE</span><strong><bdi>{v.roe}%</bdi></strong>{v.eps ? <span className="id-cap">EPS {v.eps}</span> : <span />}</div> : null}
          </div>

          <div className="art-body id-body">
            <h2>{r.sections.headline}</h2>
            {paras.map((p, i) => <p key={i}>{p}</p>)}
            <h2>{r.sections.table}</h2>
            <p className="id-cap">{r.yoyNote}</p>
            <table className="id-table id-num wrp-table">
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
            </table>
            <p>
              {initial.pdfUrl ? <a className="id-btn is-sm" href={initial.pdfUrl} target="_blank" rel="noopener">{r.pdf} ↗</a> : null}{' '}
              <Link className="id-btn is-sm" href={L(`/c/${initial.key.sym}/financials`)}>{r.allFinancials}</Link>{' '}
              <Link className="id-btn is-sm" href={L(`/c/${initial.key.sym}`)}>{r.companyPage}</Link>
            </p>
            {initial.siblings.length > 1 && RESULTS_HOME[locale] ? (
              <>
                <h2>{r.sections.filings}</h2>
                <p className="wrp-siblings">
                  {initial.siblings.map((s) => s.slug === initial.slug
                    ? <span key={s.slug} className="id-pill is-sm" aria-current="page">{periodLabel(s.period, locale)} {s.year}</span>
                    : <Link key={s.slug} className="id-pill is-sm" href={L(`${RESULTS_HOME[locale]}/${s.sym}/results/${s.slug}`)}>{periodLabel(s.period, locale)} {s.year}</Link>)}
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
