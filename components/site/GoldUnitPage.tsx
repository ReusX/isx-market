'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { localeDate } from '@/lib/date'
import { SiteShell } from './SiteShell'
import { EconRail } from './EconRail'
import { PageTitle } from './PageTitle'
import { AboutSection } from './AboutSection'
import type { GoldData, FxData } from '@/lib/rates'
import { GOLD_PAGES, goldFigures, goldUnitVars, type GoldPageDef, type GoldUnit } from '@/lib/goldPages'
import { GoldBlocks } from './GoldBlocks'
import '@/styles/econ-page.css'

/**
 * /gold/{slug} · one cut of the local gold list.
 *
 * The lead figure is the exact number the page's query asks for — the mithqal
 * at 21 karat, the gram, the ounce — so the answer is the first thing on the
 * screen and the first thing in the title, on the shared gold board
 * (GoldBlocks), whose cards and calculator replaced the old karat, weight
 * and ratio tables. The FAQ keeps those figures as text (4.608, 31.1035,
 * each karat's price) for the queries that ask them.
 */

export function GoldUnitPage({ def, gold, fx }: { def: GoldPageDef; gold: GoldData | null; fx: FxData | null }) {
  const { t, locale } = useLocale()
  const R = t.rates
  const P = R.page.goldUnit
  const meta = P.meta[def.slug]
  const f = goldFigures(def, gold, fx)
  const v = goldUnitVars(def, f, f.date ? localeDate(f.date, locale) : '—')
  /* A karat page is priced in mithqals; a unit page in its own unit. */
  const pageUnit: GoldUnit = def.kind === 'karat' ? 'mithqal' : (def.unit as GoldUnit)
  const others = GOLD_PAGES.filter((g) => g.slug !== def.slug)
  return (
    <SiteShell>
      <main className="eco id-full iq-door is-gold" data-world="ochre" data-level="accent">
        <EconRail />
        <div className="eco-body">
          <GoldBlocks gold={gold} fx={fx} title={meta.h1} titleNote={meta.lead} unit={pageUnit}
            karat={def.kind === 'karat' ? def.karat : 21} ounceLead={def.slug === 'ounce'} />

          <section className="eco-faq id-panel" aria-label={P.faqTitle(meta.h1)}>
            <h2 className="id-h3">{P.faqTitle(meta.h1)}</h2>
            {P.faq(def.slug, v).map((q) => <details key={q.q} className="eco-q"><summary>{q.q}</summary><p className="id-body">{q.a}</p></details>)}
          </section>

          <AboutSection title={P.aboutTitle(meta.h1)} body={P.about} />

          <nav className="eco-others" aria-label={P.others}>
            <p className="id-cap">{P.others}</p>
            <div className="id-pills">
              {others.map((o) => <Link key={o.slug} href={`/gold/${o.slug}`} className="id-pill">{P.meta[o.slug].short}</Link>)}
              <Link href="/gold" className="id-pill">{P.allGold}</Link>
            </div>
          </nav>
        </div>
      </main>
    </SiteShell>
  )
}
