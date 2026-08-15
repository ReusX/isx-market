import type { Metadata } from 'next'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'
export const metadata: Metadata = {
  // Personal tools · nothing here renders for a signed-out visitor, so the only
  // thing a crawler can see is "sign in required". Linked from the sidebar on
  // every page, so without this they get crawled and indexed as thin pages.
  // `follow` stays on so the links out of them still count.
  robots: { index: false, follow: true },
  title: { absolute: 'تنبيهات أسعار الأسهم العراقية · اضبط هدفك السعري' },
  description: 'اضبط تنبيهاً على أي سهم في بورصة العراق وتابع لحظة بلوغه السعر الذي تنتظره — صعوداً أو هبوطاً، بدون متابعة يدوية للأسعار.',
  alternates: seoAlternates('/alerts'),
  keywords: ['iraq stock exchange price alerts', 'isx price alerts', 'تنبيهات اسعار اسهم العراق', 'تنبيه سعر بورصة العراق'],
  openGraph: { url: absUrl('/alerts'), title: 'تنبيهات أسعار الأسهم العراقية', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}
export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Breadcrumbs trail={[{ name: 'تنبيهات الأسعار', path: '/alerts' }]} />

    </>
  )
}
