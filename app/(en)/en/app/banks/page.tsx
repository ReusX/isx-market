import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { SiteShell } from '@/components/site/SiteShell'
import { AppBanks } from '@/components/app/AppBanks'
import { banksScreen } from '@/lib/appScreens'

/** /app/banks · an app screen (components/app/AppBanks). Noindex; the website page is the indexed one. */
export const revalidate = 3600
export const dynamic = 'force-static'
export const metadata: Metadata = { title: { absolute: 'Iraqi banks and deposit rates · IQWealth' }, robots: { index: false, follow: false }, alternates: seoAlternates('/app/banks', 'en') }

export default async function Page() {
  return <SiteShell><AppBanks d={await banksScreen()} /></SiteShell>
}
