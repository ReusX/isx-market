import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'سياسة الخصوصية · IQWealth',
  description: 'كيف يجمع موقع IQWealth البيانات ويستخدمها ويحميها، وما الخيارات المتاحة لك بشأن معلوماتك.',
  alternates: seoAlternates('/privacy'),
  // og:url must agree with the canonical; a share card pointing at a
  // different URL than the page claims to be is the same defect.
  openGraph: { url: absUrl('/privacy'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
