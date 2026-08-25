import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

/*
 * This layout exists to give /analysis a canonical of its own.
 *
 * Without it the route had no metadata at all, so it inherited the ROOT
 * metadata — including `canonical: https://iraqsm.com`. An indexable page
 * telling Google it is a duplicate of the homepage is an instruction to drop
 * it from the index, which is what was happening here.
 */
export const metadata: Metadata = {
  title: 'تحليل الأسهم العراقية · بورصة العراق',
  description: 'تحليل مالي لكل شركة مدرجة في سوق العراق للأوراق المالية: أبرز المؤشرات، نقاط القوة والمخاطر، وخلاصة الأداء.',
  alternates: seoAlternates('/analysis'),
  // og:url must agree with the canonical; a share card pointing at a
  // different URL than the page claims to be is the same defect.
  openGraph: { url: absUrl('/analysis'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return children
}
