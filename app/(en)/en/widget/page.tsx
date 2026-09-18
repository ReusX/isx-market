import type { Metadata } from 'next'
import { WidgetPage } from '@/components/site/WidgetPage'
import { absUrl, seoAlternates } from '@/lib/seo'
import { messages } from '@/lib/i18n'

const W = messages('en').site.widget
export const metadata: Metadata = {
  title: { absolute: W.seoTitle },
  description: W.description,
  alternates: seoAlternates('/widget', 'en'),
  openGraph: { url: absUrl('/widget', 'en'), title: W.seoTitle, images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}
export default function Page() { return <WidgetPage /> }
