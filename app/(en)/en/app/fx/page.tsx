import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { SiteShell } from '@/components/site/SiteShell'
import { AppFx } from '@/components/app/AppRates'
import { fxScreen } from '@/lib/appScreens'

/** /app/fx · the app's dollar screen (the website's /fx without the search copy). Noindex. */
export const revalidate = 300
export const dynamic = 'force-static'
export const metadata: Metadata = { title: { absolute: 'Dollar rate in Iraq today · IQWealth' }, robots: { index: false, follow: false }, alternates: seoAlternates('/app/fx', 'en') }

export default async function Page() {
  return <SiteShell><AppFx d={await fxScreen()} /></SiteShell>
}
