import type { Metadata } from 'next'
import { WindowPage } from '@/components/site/WindowPage'
import { absUrl, seoAlternates } from '@/lib/seo'
import { messages } from '@/lib/i18n'
import { faqLd } from '@/lib/ratesFaq'

/* An explainer of a mechanism that ended in 2025; nothing here moves daily. */
export const revalidate = 86400

const P = messages('ar').rates.page.window

export const metadata: Metadata = {
  title: { absolute: P.seoTitle },
  description: P.description,
  alternates: seoAlternates('/cbi-window'),
  keywords: ['نافذة بيع العملة', 'مزاد العملة البنك المركزي العراقي', 'مزاد الدولار العراق', 'مبيعات البنك المركزي من الدولار', 'المنصة الالكترونية البنك المركزي العراقي', 'نافذة بيع العملة الاجنبية'],
  openGraph: { url: absUrl('/cbi-window'), title: P.seoTitle, images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}

export default function Page() {
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': absUrl('/cbi-window'), url: absUrl('/cbi-window'), name: P.title, inLanguage: 'ar-IQ', dateModified: '2025-02-27' },
    faqLd(P.faq),
  ] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <WindowPage />
    </>
  )
}
