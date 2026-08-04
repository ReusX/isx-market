import type { Metadata } from 'next'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
export const metadata: Metadata = {
  title: { absolute: 'أبحاث وتحليلات سوق الأسهم العراقي' },
  description: 'تقارير وتحليلات متعمقة لبورصة العراق: دراسات قطاعية، تقييم الشركات المدرجة، قراءة النتائج المالية، وتوقعات الأداء بلغة يفهمها المستثمر.',
  alternates: { canonical: 'https://iraqsm.com/research' },
  openGraph: { url: 'https://iraqsm.com/research', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}
export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}

      <Breadcrumbs trail={[{ name: 'أبحاث وتحليلات', path: '/research' }]} />
</>
}
