'use client'

import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { AboutSection } from './AboutSection'
import type { FxData } from '@/lib/rates'
import type { FxDay } from '@/lib/fxHistory'
import { FxBlocks } from './FxBlocks'
import { OtherMarkets } from './OtherMarkets'
import { CBI_OFFICIAL_RATE, CBI_RATE_CONFIRMED } from '@/lib/fxOfficial'
import type { FxQa } from '@/lib/fxCopy'
import '@/styles/econ-page.css'

/**
 * /fx · the dollar against the dinar.
 *
 * One number is the page: the parallel-market rate, display weight, with
 * the official rate and the gap beside it as facts, not rivals. Under it
 * the two series over time (our daily record of the Baghdad close; the
 * Central Bank's published rate as a dashed line), a converter, and the
 * questions people actually type, with live figures.
 *
 * Server-seeded: the rate, both series and the FAQ arrive as props. The
 * official rate is a policy figure with a confirmation date, never a
 * scraped market — see lib/fxOfficial.
 */
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })


export function FxPage({ fx, parallel, official, faq }: { fx: FxData | null; parallel: FxDay[]; official: FxDay[]; faq: FxQa[] }) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.fx
  const C = R.fx
  const market = fx?.sell ?? fx?.buy ?? null
  const officialLatest = official.length ? official[official.length - 1] : null
  const officialRate = officialLatest?.close ?? CBI_OFFICIAL_RATE
  const officialDate = officialLatest?.date ?? CBI_RATE_CONFIRMED
  const figures = { market: market == null ? '—' : nf0.format(market), official: nf0.format(officialRate) }

  return (
    <SiteShell>
      <main className="eco id-full iq-door" data-world="dinar" data-level="accent">
        <EconRail />
        <div className="eco-body">
          <FxBlocks fx={fx} parallel={parallel} officialRate={officialRate} officialDate={officialDate}
            title={P.title} titleNote={C.referenceCaveat} unitLabel={P.perDollar} />
          <OtherMarkets />

          {faq.length ? (
            <section className="eco-faq id-panel" aria-label={P.faqTitle}>
              <h2 className="id-h3">{P.faqTitle}</h2>
              {faq.map((f) => (
                <details key={f.q} className="eco-q">
                  <summary>{f.q}</summary>
                  <p className="id-body">{f.a}</p>
                </details>
              ))}
            </section>
          ) : null}

          {/* The English paragraph on the ARABIC page is deliberate: the
              queries «usd to iqd» and «iraqi dinar to dollar» land here, and
              a snippet is the wrong place to buy that coverage. */}
          {locale === 'ar' ? (
            <details className="iqa id-read eco-en" dir="ltr">
              <summary className="iqa-sum"><h2 className="id-h3">{P.enBlock.title}</h2></summary>
              <div className="iqa-body"><p className="id-body">{P.enBlock.body(figures)}</p></div>
            </details>
          ) : null}
          <AboutSection title={P.about.title} body={P.about.body(figures)} />
        </div>
      </main>
    </SiteShell>
  )
}
