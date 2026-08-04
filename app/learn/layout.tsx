import type { Metadata } from 'next'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
export const metadata: Metadata = {
  title: { absolute: 'تعلّم الاستثمار في بورصة العراق من الصفر' },
  description: 'دروس مبسّطة للمبتدئين: كيف تفتح حساب تداول في العراق، كيف تقرأ سعر السهم والمؤشر، ما معنى المكرر الربحي، وكيف تبني محفظتك الأولى خطوة بخطوة.',
  alternates: { canonical: 'https://iraqsm.com/learn' },
  openGraph: { url: 'https://iraqsm.com/learn', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}

      <Breadcrumbs trail={[{ name: 'تعلّم الاستثمار', path: '/learn' }]} />
</>
}
