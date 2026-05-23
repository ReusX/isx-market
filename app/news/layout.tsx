import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'اخبار الاسهم العراقية | أخبار بورصة العراق — ISX News',
  description: 'اخبار الاسهم العراقية — آخر أخبار وتحديثات بورصة العراق للأوراق المالية يومياً. تقارير حركة السوق، قرارات الشركات المدرجة، والأحداث الاقتصادية. Iraq stock market news and daily ISX updates.',
  alternates: { canonical: 'https://iraqsm.com/news' },
  keywords: ['اخبار الاسهم العراقية', 'أخبار بورصة العراق', 'اخبار سوق الاسهم', 'iraq stock market news', 'ISX news'],
  openGraph: { url: 'https://iraqsm.com/news', title: 'اخبار الاسهم العراقية | ISX News', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
}
export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
