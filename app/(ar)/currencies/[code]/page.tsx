import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchCurrencies, fetchFx } from '@/lib/rates'
import { CURRENCY_PAGES, currencyPage, currencyHistory } from '@/lib/currencyPages'
import { CurrencyPage } from '@/components/site/CurrencyPage'
import { currencyFigures, faqVars, fmtIqd, fmtX } from '@/lib/currencyFigures'
import { absUrl, seoAlternates } from '@/lib/seo'
import { messages } from '@/lib/i18n'
import { faqLd } from '@/lib/ratesFaq'

/**
 * /currencies/{code} — «سعر اليورو اليوم في العراق» and its seven siblings.
 * Same cadence as /currencies: static, regenerated every 3h.
 */
export const revalidate = 10800
export const dynamicParams = false

export function generateStaticParams() {
  return CURRENCY_PAGES.map((c) => ({ code: c.slug }))
}

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const def = currencyPage(params.code)
  if (!def) return { title: 'Not found', robots: { index: false, follow: false } }
  const P = messages('ar').rates.page.currency
  const name = P.meta[def.code]?.page ?? messages('ar').rates.page.currencies.names[def.code] ?? def.code
  const [cur, fx] = await Promise.all([fetchCurrencies(), fetchFx()])
  const f = currencyFigures(def.code, cur, fx)
  const unit = def.toman ? 1_000_000 : 1
  const iqd = f.iqd != null ? fmtIqd(f.iqd * unit) : null
  const path = `/currencies/${def.slug}`
  const short = P.meta[def.code]?.short ?? name
  return {
    /* The live figure goes in the title, as on /fx — that is the SERP line that earns the click. */
    title: { absolute: iqd ? (def.toman ? P.seoTitleToman(iqd) : P.seoTitle(name, iqd)) : P.seoTitleNoRate(name) },
    description: P.description(name, iqd ?? '—', f.perUsd ? `${fmtX(def.toman ? f.perUsd / 10 : f.perUsd)} ${short}` : '—'),
    alternates: seoAlternates(path),
    keywords: [`سعر ${name} اليوم في العراق`, `سعر ${name} بالدينار العراقي`, `${name} مقابل الدينار العراقي`, def.toman ? '100 الف تومان كم دينار عراقي' : `100 ${short} كم دينار عراقي`, ...(def.toman ? ['سعر التومان الايراني مقابل الدينار العراقي', 'سعر الريال الايراني بالدينار العراقي'] : []), `سعر ${short} اليوم`, `${def.code} to IQD`],
    openGraph: { url: absUrl(path), title: iqd ? (def.toman ? P.seoTitleToman(iqd) : P.seoTitle(name, iqd)) : P.seoTitleNoRate(name), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  }
}

export default async function Page({ params }: { params: { code: string } }) {
  const def = currencyPage(params.code)
  if (!def) notFound()
  const [cur, fx, history] = await Promise.all([fetchCurrencies(), fetchFx(), currencyHistory(def)])
  const M = messages('ar').rates.page
  const name = M.currency.meta[def.code]?.page ?? M.currencies.names[def.code] ?? def.code
  const faq = M.currency.faq(faqVars(def.code, name, M.currency.meta[def.code]?.short ?? def.code, cur, fx, !!def.toman, !!def.peg, 'ar'))
  const path = `/currencies/${def.slug}`
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': absUrl(path), url: absUrl(path), name: M.currency.title(name), inLanguage: 'ar-IQ', ...(cur?.updatedAt ? { dateModified: cur.updatedAt } : {}) },
      faqLd(faq),
    ],
  }
  const others = CURRENCY_PAGES.filter((c) => c.code !== def.code).map((c) => ({ code: c.code, slug: c.slug }))
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <CurrencyPage code={def.code} peg={def.peg} toman={!!def.toman} cur={cur} fx={fx} history={history} others={others} />
    </>
  )
}
