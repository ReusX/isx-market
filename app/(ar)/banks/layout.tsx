import type { Metadata } from 'next'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'
export const metadata: Metadata = {
  title: { absolute: 'المصارف العراقية المدرجة · أسعار أسهم البنوك' },
  description: 'أسعار أسهم المصارف العراقية المدرجة في بورصة العراق — التجارية والاستثمارية والإسلامية — مع التغيّر اليومي، حجم التداول والقيمة السوقية لكل مصرف.',
  alternates: seoAlternates('/banks'),
  openGraph: {
    url: absUrl('/banks'),
    title: 'المصارف العراقية | بورصة العراق ISX',
    description: 'أسعار أسهم المصارف العراقية المدرجة في بورصة العراق للأوراق المالية.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  keywords: ['مصرف الرافدين', 'مصرف الرشيد', 'مصرف بغداد', 'المصارف العراقية', 'بنوك العراق', 'مصرف التنمية الدولي'],
}
export default function BanksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}

      <Breadcrumbs trail={[{ name: 'الشركات', path: '/companies' }, { name: 'المصارف', path: '/banks' }]} />
</>
}
