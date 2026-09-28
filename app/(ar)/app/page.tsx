import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { SiteShell } from '@/components/site/SiteShell'
import { AppHome } from '@/components/app/AppHome'

/** /app · the app's home screen (the reader's own cards). Personal, so noindex. */
export const metadata: Metadata = {
  title: { absolute: 'الرئيسية · IQWealth' },
  robots: { index: false, follow: false },
  alternates: seoAlternates('/app'),
}

export default function Page() {
  return <SiteShell><AppHome /></SiteShell>
}
