import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { SiteShell } from '@/components/site/SiteShell'
import { AppWidgets } from '@/components/app/AppWidgets'

/** /app/widgets · customise the home-screen widgets (app only). Noindex. */
export const metadata: Metadata = { title: { absolute: 'Widgets · IQWealth' }, robots: { index: false, follow: false }, alternates: seoAlternates('/app/widgets', 'en') }

export default function Page() {
  return <SiteShell><AppWidgets /></SiteShell>
}
