import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { SiteShell } from '@/components/site/SiteShell'
import { AppMarket } from '@/components/app/AppMarket'
import { marketScreen } from '@/lib/appScreens'

/** /app/market · an app screen (components/app/AppMarket). Noindex; the website page is the indexed one. */
export const revalidate = 300
export const dynamic = 'force-static'
export const metadata: Metadata = { title: { absolute: 'بورصة العراق اليوم · IQWealth' }, robots: { index: false, follow: false }, alternates: seoAlternates('/app/market') }

export default async function Page() {
  return <SiteShell><AppMarket d={await marketScreen()} /></SiteShell>
}
