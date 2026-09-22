import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchGold, fetchFx } from '@/lib/rates'
import { GOLD_PAGES, goldPage, goldFigures, goldUnitVars } from '@/lib/goldPages'
import { GoldUnitPage } from '@/components/site/GoldUnitPage'
import { absUrl, seoAlternates } from '@/lib/seo'
import { messages } from '@/lib/i18n'
import { faqLd } from '@/lib/ratesFaq'
import { localeDate } from '@/lib/date'

/**
 * /gold/{slug} — «سعر مثقال الذهب اليوم في العراق عيار 21» and its three
 * siblings. Same cadence as /gold: static, regenerated every three hours.
 */
export const revalidate = 10800
export const dynamicParams = false

export function generateStaticParams() {
  return GOLD_PAGES.map((g) => ({ unit: g.slug }))
}

const KEYWORDS: Record<string, string[]> = {
  mithqal: [
    'سعر مثقال الذهب اليوم في العراق عيار 21', 'سعر مثقال الذهب اليوم', 'سعر المثقال اليوم في العراق',
    'كم سعر مثقال الذهب اليوم في العراق', 'شكد سعر مثقال الذهب اليوم', 'مثقال الذهب اليوم',
    'سعر مثقال الذهب اليوم في العراق عيار 24', 'المثقال كم غرام', 'سعر مثقال الذهب اليوم في العراق 2026',
  ],
  gram: [
    'سعر غرام الذهب في العراق', 'سعر جرام الذهب عيار 21', 'سعر الغرام الذهب في العراق',
    'سعر غرام الذهب اليوم', 'غرام الذهب في العراق', 'سعر جرام الذهب اليوم', 'كم سعر 10 غرام ذهب',
  ],
  ounce: ['سعر اونصة الذهب', 'سعر اونصة الذهب اليوم', 'اونصة الذهب', 'الاونصة كم مثقال', 'الاونصة كم غرام', 'gold price per ounce'],
  '21': [
    'سعر الذهب اليوم عيار 21', 'سعر الذهب عيار 21', 'سعر الذهب اليوم في العراق عيار 21',
    'سعر جرام الذهب عيار 21', 'كم سعر مثقال الذهب اليوم في العراق عيار 21', 'سعر نصف مثقال ذهب',
  ],
}

export async function generateMetadata({ params }: { params: { unit: string } }): Promise<Metadata> {
  const def = goldPage(params.unit)
  if (!def) return { title: 'Not found', robots: { index: false, follow: false } }
  const P = messages('ar').rates.page.goldUnit
  const meta = P.meta[def.slug]
  const [gold, fx] = await Promise.all([fetchGold(), fetchFx()])
  const f = goldFigures(def, gold, fx)
  const v = goldUnitVars(def, f, f.date ? localeDate(f.date, 'ar') : '—')
  /* The live figure goes in the title, as on /fx and /currencies/{code} —
     that is the line in the results that earns the click. */
  const headline = def.slug === 'ounce' ? v.ounceUsd : v.lead
  const path = `/gold/${def.slug}`
  return {
    title: { absolute: meta.seoTitle(headline) },
    description: meta.description(headline, v.date),
    alternates: seoAlternates(path),
    keywords: KEYWORDS[def.slug],
    openGraph: { url: absUrl(path), title: meta.seoTitle(headline), description: meta.description(headline, v.date), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  }
}

export default async function Page({ params }: { params: { unit: string } }) {
  const def = goldPage(params.unit)
  if (!def) notFound()
  const [gold, fx] = await Promise.all([fetchGold(), fetchFx()])
  const P = messages('ar').rates.page.goldUnit
  const meta = P.meta[def.slug]
  const f = goldFigures(def, gold, fx)
  const v = goldUnitVars(def, f, f.date ? localeDate(f.date, 'ar') : '—')
  /* The visible FAQ and this markup are the same call on the same figures. */
  const faq = P.faq(def.slug, v)
  const path = `/gold/${def.slug}`
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': absUrl(path),
        url: absUrl(path),
        name: meta.h1,
        inLanguage: 'ar-IQ',
        ...(f.date ? { dateModified: f.date } : {}),
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'IQWealth', item: absUrl('/') },
            { '@type': 'ListItem', position: 2, name: messages('ar').rates.page.gold.title, item: absUrl('/gold') },
            { '@type': 'ListItem', position: 3, name: meta.h1, item: absUrl(path) },
          ],
        },
      },
      faqLd(faq),
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <GoldUnitPage def={def} gold={gold} fx={fx} />
    </>
  )
}
