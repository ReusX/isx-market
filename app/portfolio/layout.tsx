import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: { absolute: 'محفظتي · متابعة أرباح وخسائر أسهمك العراقية' },
  description: 'تتبّع محفظتك في بورصة العراق: القيمة الحالية، الأرباح والخسائر، متوسط الكلفة لكل سهم، والتوزيع حسب القطاع — مجاناً وبدون وسيط.',
  alternates: { canonical: 'https://iraqsm.com/portfolio' },
  keywords: ['iraq stock exchange portfolio', 'isx portfolio tracker', 'محفظة اسهم العراق', 'متابعة محفظة بورصة العراق'],
  openGraph: { url: 'https://iraqsm.com/portfolio', title: 'ISX Portfolio Tracker · محفظتي | بورصة العراق', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}
export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  )
}
