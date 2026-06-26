import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: { absolute: 'خريطة السوق الحرارية · بورصة العراق | ISX Market Heatmap' },
  description: 'خريطة حرارية لسوق العراق للأوراق المالية: كل الأسهم مرتبة حسب القطاع، حجم المربع يمثل القيمة السوقية ولونه يمثل التغيّر (يوم/أسبوع/شهر/سنة). ISX market heatmap · every Iraq Stock Exchange stock as a treemap tile sized by market cap and colored by performance.',
  alternates: { canonical: 'https://iraqsm.com/heatmap' },
  keywords: [
    'iraq stock exchange heatmap', 'isx heatmap', 'isx market map', 'isx treemap',
    'خريطة السوق العراقي', 'خريطة حرارية بورصة العراق', 'سوق الاسهم العراقي',
  ],
  openGraph: {
    url: 'https://iraqsm.com/heatmap',
    title: 'ISX Market Heatmap · خريطة السوق الحرارية | بورصة العراق',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}
export default function HeatmapLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        خريطة السوق الحرارية · سوق العراق للأوراق المالية | Iraq Stock Exchange Market Heatmap
      </h1>
      {children}
    </>
  )
}
