import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { OwnershipPage } from '@/components/routes/OwnershipPage'

export const metadata: Metadata = {
  // Without this the page inherited the parent layout's canonical and
  // declared itself a duplicate of /statistics.
  alternates: seoAlternates('/statistics/ownership'),
  // og:url must agree with the canonical; a share card pointing at a
  // different URL than the page claims to be is the same defect.
  openGraph: { url: absUrl('/statistics/ownership'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  title: 'ملكية الشركات | IQWealth',
  description: 'حصة المستثمرين الأجانب من رأس المال المودع في شركات سوق العراق للأوراق المالية، من آخر تقرير إيداع شهري متاح.',
}

export default function Page() {
  return <OwnershipPage />
}
