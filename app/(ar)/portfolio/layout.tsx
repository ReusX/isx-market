import type { Metadata } from 'next'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'
export const metadata: Metadata = {
  // Personal tools · nothing here renders for a signed-out visitor, so the only
  // thing a crawler can see is "sign in required". Linked from the sidebar on
  // every page, so without this they get crawled and indexed as thin pages.
  // `follow` stays on so the links out of them still count.
  robots: { index: false, follow: true },
  title: { absolute: 'محفظتي · متابعة أرباح وخسائر أسهمك العراقية' },
  description: 'تتبّع محفظتك في بورصة العراق: القيمة الحالية، الأرباح والخسائر، متوسط الكلفة لكل سهم، والتوزيع حسب القطاع — مجاناً وبدون وسيط.',
  alternates: seoAlternates('/portfolio'),
  keywords: ['iraq stock exchange portfolio', 'isx portfolio tracker', 'محفظة اسهم العراق', 'متابعة محفظة بورصة العراق'],
  openGraph: { url: absUrl('/portfolio'), title: 'محفظتي · متابعة أسهمك في بورصة العراق', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}
export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Breadcrumbs trail={[{ name: 'محفظتي', path: '/portfolio' }]} />

    </>
  )
}
