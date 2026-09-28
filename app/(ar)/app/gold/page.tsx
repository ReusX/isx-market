import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { SiteShell } from '@/components/site/SiteShell'
import { AppGold } from '@/components/app/AppGold'
import { goldScreen } from '@/lib/appScreens'

/** /app/gold · the app's gold screen (the website's /gold without the search copy). Noindex. */
export const revalidate = 3600
export const dynamic = 'force-static'
export const metadata: Metadata = { title: { absolute: 'سعر الذهب اليوم في العراق · IQWealth' }, robots: { index: false, follow: false }, alternates: seoAlternates('/app/gold') }

export default async function Page() {
  return <SiteShell><AppGold d={await goldScreen()} /></SiteShell>
}
