import type { Metadata } from 'next'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'

// The page itself is a client component, so it cannot export metadata — without
// this layout /statistics inherited the site default and competed with the
// homepage for the same title.
export const metadata: Metadata = {
  /* Retitled with this phase. The old title described a foreign-flow and
     ownership hub, which is what the route used to be; it is now a market
     statistics workspace, and a title that names modules the page no longer
     leads with is a title Google will replace with scraped text. The house
     rules still hold: one script, no brand token, Arabic-only description
     inside the snippet budget. */
  title: { absolute: 'احصائيات بورصة العراق · حجم السوق ونشاطه وقيمته السوقية' },
  description: 'إحصاءات سوق العراق للأوراق المالية: قيمة التداول والحجم والصفقات عبر الزمن، القيمة السوقية حسب القطاع، تركّز السوق، مكرر الربحية، ونشاط القطاعات الشهري.',
  alternates: seoAlternates('/statistics'),
  openGraph: {
    url: absUrl('/statistics'),
    title: 'احصائيات بورصة العراق · حجم السوق ونشاطه وقيمته السوقية',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function StatisticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}

      <Breadcrumbs trail={[{ name: 'إحصاءات السوق', path: '/statistics' }]} />
</>
}
