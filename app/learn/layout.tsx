import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'تعلّم الاستثمار | ISX Learn',
  description: 'تعلّم الاستثمار وتداول الأسهم في بورصة العراق من الصفر — دروس للمبتدئين، شرح المؤشرات، تحليل الأسهم، وكيفية قراءة السوق العراقي. Learn investing and stock trading on the Iraq Stock Exchange from beginner to advanced.',
  alternates: { canonical: 'https://iraqsm.com/learn' },
  openGraph: { url: 'https://iraqsm.com/learn', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
}
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
