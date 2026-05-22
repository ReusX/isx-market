import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'أخبار بورصة العراق | ISX News',
  description: 'آخر أخبار وتحديثات سوق الأسهم العراقي — تقارير يومية عن حركة السوق، قرارات الشركات المدرجة، والأحداث الاقتصادية في العراق. Latest Iraq Stock Exchange news, daily market reports and company announcements.',
  alternates: { canonical: 'https://iraqsm.com/news' },
  openGraph: { url: 'https://iraqsm.com/news', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
}
export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
