import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'اتصل بنا · IQWealth',
  description: 'تواصل مع فريق IQWealth بخصوص بيانات بورصة العراق، الشراكات، أو الإبلاغ عن خطأ في الأسعار.',
  alternates: seoAlternates('/contact'),
  // og:url must agree with the canonical; a share card pointing at a
  // different URL than the page claims to be is the same defect.
  openGraph: { url: absUrl('/contact'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
