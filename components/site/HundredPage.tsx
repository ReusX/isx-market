'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import { CBI_OFFICIAL_RATE, CBI_RATE_CONFIRMED } from '@/lib/fxOfficial'
import type { FxData } from '@/lib/rates'
import '@/styles/econ-page.css'

/**
 * /fx/100-dollar · «كم سعر 100 دولار في العراق اليوم».
 *
 * Search Console, week of 2026-09-14: four spellings of this one question
 * drew ~4,400 impressions, and «سعر الورق» — the same question in market
 * slang, since «الورق» is the hundred-dollar note — another 1,000. All of it
 * was answered by a line in the /fx FAQ. This page carries the question in
 * its title and the answer in its first line, then the whole denomination
 * ladder at both rates, which is the follow-up people ask next.
 */
const NOTES = [1, 5, 10, 20, 50, 100, 200, 500, 1000]
const IQD_AMOUNTS = [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000]
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function HundredPage({ fx }: { fx: FxData | null }) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.hundred
  const rate = fx?.sell ?? fx?.buy ?? null
  const hundred = rate != null ? rate * 100 : null
  const hundredOfficial = CBI_OFFICIAL_RATE * 100

  return (
    <SiteShell>
      <main className="eco id-full iq-door">
        <EconRail />
        <div className="eco-body">
          <header className="eco-head">
            <p className="id-eyebrow">{R.page.eyebrow}</p>
            <PageTitle title={P.h1} note={P.lead} />
            {hundred == null ? <p className="id-note">{R.tools.unavailable}</p> : (
              <>
                <p className="eco-lead id-num">
                  <strong><bdi>{nf0.format(hundred)}</bdi></strong>
                  <span className="eco-unit">{P.unit}</span>
                </p>
                <p className="id-cap eco-when">
                  {fx?.date ? R.tools.observedOn(localeDate(fx.date, locale)) : R.tools.noObserved}
                </p>
                <div className="id-stats id-num eco-stats">
                  <div className="id-stat"><small>{P.market}</small><b><bdi>{nf0.format(hundred)}</bdi></b><span className="id-cap">{nf0.format(rate as number)} / $1</span></div>
                  <div className="id-stat"><small>{P.official}</small><b><bdi>{nf0.format(hundredOfficial)}</bdi></b><span className="id-cap">{R.page.fx.officialNote(localeDate(CBI_RATE_CONFIRMED, locale))}</span></div>
                  <div className="id-stat"><small>{P.gap}</small><b><bdi>{nf0.format(hundred - hundredOfficial)}</bdi></b><span className="id-cap">{nf0.format(((hundred - hundredOfficial) / hundredOfficial) * 100)}%</span></div>
                </div>
              </>
            )}
          </header>

          {rate != null ? (
            <section className="id-panel eco-panel" aria-label={P.notes}>
              <PageTitle as="h2" className="id-h3" title={P.notes} note={P.notesNote} />
              <div className="eco-two">
                <div className="id-table-scroll">
                  <table className="id-table eco-table id-num">
                    <thead><tr><th scope="col">{P.colUsd}</th><th scope="col" className="is-end">{P.colMarket}</th><th scope="col" className="is-end">{P.colOfficial}</th></tr></thead>
                    <tbody>
                      {NOTES.map((n) => (
                        <tr key={n} className={n === 100 ? 'is-lead' : ''}>
                          <td><bdi>${nf0.format(n)}</bdi></td>
                          <td className="is-end"><bdi>{nf0.format(rate * n)}</bdi></td>
                          <td className="is-end"><bdi>{nf0.format(CBI_OFFICIAL_RATE * n)}</bdi></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="id-table-scroll">
                  <table className="id-table eco-table id-num">
                    <thead><tr><th scope="col">{P.colIqd}</th><th scope="col" className="is-end">{P.colBack}</th></tr></thead>
                    <tbody>
                      {IQD_AMOUNTS.map((a) => (
                        <tr key={a}><td><bdi>{nf0.format(a)}</bdi></td><td className="is-end"><bdi>${nf2.format(a / rate)}</bdi></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="id-cap">{P.reverseNote}</p>
            </section>
          ) : null}

          <section className="id-panel eco-panel" aria-label={P.waraq}>
            <PageTitle as="h2" className="id-h3" title={P.waraq} />
            {P.waraqBody.map((p) => <p key={p} className="id-body">{p}</p>)}
          </section>

          <section className="eco-faq" aria-label={P.faqTitle}>
            <h2 className="id-h3">{P.faqTitle}</h2>
            {P.faq({
              hundred: hundred != null ? nf0.format(hundred) : '—',
              hundredOfficial: nf0.format(hundredOfficial),
              rate: rate != null ? nf0.format(rate) : '—',
              official: nf0.format(CBI_OFFICIAL_RATE),
              gap: hundred != null ? nf0.format(hundred - hundredOfficial) : '—',
              date: fx?.date ? localeDate(fx.date, locale) : '—',
            }).map((q) => <details key={q.q} className="eco-q"><summary>{q.q}</summary><p className="id-body">{q.a}</p></details>)}
          </section>

          <AboutSection title={P.aboutTitle} body={P.about} />

          <nav className="eco-others" aria-label={P.seeFx}>
            <div className="id-pills"><Link href="/fx" className="id-pill">{P.seeFx}</Link></div>
          </nav>
        </div>
      </main>
    </SiteShell>
  )
}
