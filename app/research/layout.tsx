import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'أبحاث وتحليلات | ISX Research',
  description: 'تقارير وتحليلات مالية متعمقة لسوق الأسهم العراقي · دراسات قطاعية، تقييم الشركات المدرجة في بورصة العراق، وتوقعات الأداء. In-depth Iraq Stock Exchange research, sector analysis and company valuations.',
  alternates: { canonical: 'https://iraqsm.com/research' },
  openGraph: { url: 'https://iraqsm.com/research', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}
export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
