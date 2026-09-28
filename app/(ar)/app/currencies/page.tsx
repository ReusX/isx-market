import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { SiteShell } from '@/components/site/SiteShell'
import { AppCurrencies } from '@/components/app/AppRates'
import { currenciesScreen } from '@/lib/appScreens'

/** /app/currencies · searchable currency list for the app. Noindex. */
export const revalidate = 3600
export const dynamic = 'force-static'
export const metadata: Metadata = { title: { absolute: 'أسعار العملات اليوم في العراق · IQWealth' }, robots: { index: false, follow: false }, alternates: seoAlternates('/app/currencies') }

export default async function Page() {
  return <SiteShell><AppCurrencies d={await currenciesScreen()} /></SiteShell>
}
