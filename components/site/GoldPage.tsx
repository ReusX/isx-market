'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { AboutSection } from './AboutSection'
import type { GoldData, FxData } from '@/lib/rates'
import { goldFaqFigures } from '@/lib/ratesFaq'
import { GOLD_PAGES } from '@/lib/goldPages'
import { GoldBlocks } from './GoldBlocks'
import '@/styles/econ-page.css'

/**
 * /gold · the local gold list.
 *
 * The number a buyer asks for first — a 21K mithqal — leads, on the shared
 * gold board (GoldBlocks: figure, week chart, calculator, story cards);
 * then the unit pages, the FAQ (each karat's price as text) and About. These
 * are a published local list, re-read every three hours, not a converted
 * world price; the copy says so.
 */

export function GoldPage({ gold, fx }: { gold: GoldData | null; fx: FxData | null }) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.gold

  return (
    <SiteShell>
      <main className="eco id-full iq-door is-gold" data-world="ochre" data-level="accent">
        <EconRail />
        <div className="eco-body">
          <GoldBlocks gold={gold} fx={fx} title={P.title} titleNote={P.leadNote} unit="mithqal" />

          {/* The four cuts people actually search for, each on its own page.
              Listed first so a reader who came for «المثقال» sees that page
              immediately rather than scrolling a table of every unit. */}
          <nav className="eco-others" aria-label={R.page.goldUnit.others}>
            <p className="id-cap">{R.page.goldUnit.others}</p>
            <div className="id-pills">
              {GOLD_PAGES.map((g) => <Link key={g.slug} href={`/gold/${g.slug}`} className="id-pill">{R.page.goldUnit.meta[g.slug].short}</Link>)}
            </div>
          </nav>

          <section className="eco-faq id-panel" aria-label={P.faqTitle}>
            <h2 className="id-h3">{P.faqTitle}</h2>
            {P.faq(goldFaqFigures(gold, locale)).map((f) => (
              <details key={f.q} className="eco-q"><summary>{f.q}</summary><p className="id-body">{f.a}</p></details>
            ))}
          </section>

          <AboutSection title={P.about.title} body={P.about.body} />
        </div>
      </main>
    </SiteShell>
  )
}
