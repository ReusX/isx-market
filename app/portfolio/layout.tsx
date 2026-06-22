import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: { absolute: 'محفظتي — بورصة العراق | ISX Portfolio Tracker' },
  description: 'تتبّع محفظتك في سوق العراق للأوراق المالية: القيمة الحالية، الأرباح والخسائر، متوسط الكلفة، والتوزيع حسب القطاع. Track your Iraq Stock Exchange (ISX) portfolio — live value, profit/loss, cost basis and sector allocation.',
  alternates: { canonical: 'https://iraqsm.com/portfolio' },
  keywords: ['iraq stock exchange portfolio', 'isx portfolio tracker', 'محفظة اسهم العراق', 'متابعة محفظة بورصة العراق'],
  openGraph: { url: 'https://iraqsm.com/portfolio', title: 'ISX Portfolio Tracker — محفظتي | بورصة العراق', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}
export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        محفظتي — سوق العراق للأوراق المالية | Iraq Stock Exchange Portfolio Tracker
      </h1>
      {children}
    </>
  )
}
