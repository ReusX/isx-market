import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { ForeignFlowClient } from './ForeignFlowClient'

export const metadata: Metadata = {
  // Without this the page inherited the parent layout's canonical and
  // declared itself a duplicate of /statistics.
  alternates: seoAlternates('/statistics/foreign-flow'),
  // og:url must agree with the canonical; a share card pointing at a
  // different URL than the page claims to be is the same defect.
  openGraph: { url: absUrl('/statistics/foreign-flow'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  /* The old title and description said «اليوم» and «يُحدَّث يومياً». The data
     arrives with the trading bulletin and the latest stored session is not
     necessarily today's, so both claims were sometimes false. The page names
     the exact session instead. */
  title: 'تدفق المستثمر الأجنبي | بورصة العراق',
  description: 'شراء وبيع المستثمرين غير العراقيين في سوق العراق للأوراق المالية: صافي التدفق لكل جلسة، الرصيد التراكمي، وأكثر الشركات والقطاعات نشاطاً — مع تاريخ كل جلسة.',
}

export default function ForeignFlowPage() {
  return <ForeignFlowClient />
}
