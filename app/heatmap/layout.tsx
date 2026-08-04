import type { Metadata } from 'next'
import Freshness from '@/components/seo/Freshness'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
export const metadata: Metadata = {
  title: { absolute: 'خريطة السوق الحرارية · أداء أسهم بورصة العراق' },
  description: 'السوق العراقي كله في صورة واحدة: كل سهم مربّع بحجم قيمته السوقية ولون يعبّر عن تغيّره، مجمّعاً حسب القطاع — لليوم أو الأسبوع أو الشهر أو السنة.',
  alternates: { canonical: 'https://iraqsm.com/heatmap' },
  keywords: [
    'iraq stock exchange heatmap', 'isx heatmap', 'isx market map', 'isx treemap',
    'خريطة السوق العراقي', 'خريطة حرارية بورصة العراق', 'سوق الاسهم العراقي',
  ],
  openGraph: {
    url: 'https://iraqsm.com/heatmap',
    title: 'خريطة السوق الحرارية · أداء أسهم بورصة العراق',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function HeatmapLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Breadcrumbs trail={[{ name: 'خريطة السوق', path: '/heatmap' }]} />


      <Freshness
        url="https://iraqsm.com/heatmap"
        name="خريطة السوق الحرارية"
        description="أداء أسهم بورصة العراق كخريطة حرارية مجمّعة حسب القطاع."
      />

    </>
  )
}
