import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'أخبار بورصة العراق | ISX News',
  description: 'آخر أخبار وتحديثات بورصة العراق للأوراق المالية. Latest Iraq Stock Exchange news and market updates.',
  alternates: { canonical: 'https://iraqsm.com/news' },
  openGraph: { url: 'https://iraqsm.com/news', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
}
export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
