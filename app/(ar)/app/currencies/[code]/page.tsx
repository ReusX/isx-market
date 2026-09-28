import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { seoAlternates } from '@/lib/seo'
import { SiteShell } from '@/components/site/SiteShell'
import { AppCurrency } from '@/components/app/AppRates'
import { currencyCodes, currencyScreen } from '@/lib/appScreens'
import { messages } from '@/lib/i18n'

/** /app/currencies/{code} · one currency, in the dollar screen's layout. Noindex. */
export const revalidate = 3600
export const dynamicParams = false
export function generateStaticParams() { return currencyCodes().map((code) => ({ code })) }
export function generateMetadata({ params }: { params: { code: string } }): Metadata {
  const name = (messages('ar').rates.page.currencies.names as Record<string, string>)[params.code.toUpperCase()] ?? params.code.toUpperCase()
  return { title: { absolute: `${name} · IQWealth` }, robots: { index: false, follow: false }, alternates: seoAlternates(`/app/currencies/${params.code}`) }
}

export default async function Page({ params }: { params: { code: string } }) {
  const d = await currencyScreen(params.code)
  if (!d) notFound()
  return <SiteShell><AppCurrency d={d} /></SiteShell>
}
