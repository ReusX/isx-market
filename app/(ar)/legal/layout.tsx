import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'إخلاء المسؤولية والشروط · IQWealth',
  description: 'شروط استخدام موقع IQWealth وإخلاء المسؤولية عن بيانات أسعار الأسهم العراقية. المحتوى لأغراض معلوماتية ولا يُعد نصيحة استثمارية.',
  alternates: seoAlternates('/legal'),
  // og:url must agree with the canonical; a share card pointing at a
  // different URL than the page claims to be is the same defect.
  openGraph: { url: absUrl('/legal'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return children
}
