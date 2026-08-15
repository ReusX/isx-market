import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { BackHeader } from '../_ui'
import { DailyForeignFlowFull } from '../DailyForeignFlow'

export const metadata: Metadata = {
  // Without this the page inherited the parent layout's canonical and
  // declared itself a duplicate of /statistics.
  alternates: seoAlternates('/statistics/foreign-flow'),
  // og:url must agree with the canonical; a share card pointing at a
  // different URL than the page claims to be is the same defect.
  openGraph: { url: absUrl('/statistics/foreign-flow'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  title: 'تدفق المستثمر الأجنبي اليوم | بورصة العراق',
  description: 'صافي شراء وبيع المستثمرين غير العراقيين لكل شركة في سوق العراق للأوراق المالية، محدّث يومياً مع نشرة التداول.',
}

export default function ForeignFlowPage() {
  return (
    <main className="terminal-shell app-page statistics-detail-page">
      <BackHeader
        title="تدفق المستثمر الأجنبي اليوم" live
        subtitle="صافي شراء/بيع غير العراقيين لكل شركة · يُحدَّث يومياً مع نشرة التداول"
      />
      <DailyForeignFlowFull />
    </main>
  )
}
