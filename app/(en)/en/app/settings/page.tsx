import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { SiteShell } from '@/components/site/SiteShell'
import { AppSettings } from '@/components/app/AppSettings'

/** /app/settings · interests, launch page and home cards for this phone. Noindex. */
export const metadata: Metadata = {
  title: { absolute: 'App settings · IQWealth' },
  robots: { index: false, follow: false },
  alternates: seoAlternates('/app/settings', 'en'),
}

export default function Page() {
  return <SiteShell><AppSettings /></SiteShell>
}
