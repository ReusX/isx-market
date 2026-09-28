import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { SiteShell } from '@/components/site/SiteShell'
import { AppCompanies } from '@/components/app/AppMarket'
import { marketScreen } from '@/lib/appScreens'

/** /app/companies · an app screen (components/app/AppMarket). Noindex; the website page is the indexed one. */
export const revalidate = 300
export const dynamic = 'force-static'
export const metadata: Metadata = { title: { absolute: 'أسعار أسهم الشركات العراقية · IQWealth' }, robots: { index: false, follow: false }, alternates: seoAlternates('/app/companies') }

export default async function Page() {
  return <SiteShell><AppCompanies d={await marketScreen()} /></SiteShell>
}
