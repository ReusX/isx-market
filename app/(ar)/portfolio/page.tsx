import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { Portfolio } from '@/components/routes/Portfolio'

export const metadata: Metadata = {
  title: 'المحفظة · متابعة أسهمك في بورصة العراق',
  description: 'تابع قيمة محفظتك وأرباحها غير المحققة وتوزيعها على القطاعات، محسوبة من أسعار الإغلاق الرسمية لبورصة العراق.',
  // A personal workspace is not a landing page.
  robots: { index: false, follow: false },
  /* Self-canonical even while noindex: without it the page inherits the root
     layout's canonical and tells a crawler it duplicates the homepage.
     ⚠ NO hreflang — /portfolio is mirrored for usability, not for search, and
     the registry classes it `private` so `seoAlternates` emits none. */
  alternates: seoAlternates('/portfolio'),
}

export default function Page() {
  return <Portfolio />
}
