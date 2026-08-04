import type { Metadata } from 'next'

// The page itself is a client component, so it cannot export metadata — without
// this layout /statistics inherited the site default and competed with the
// homepage for the same title.
export const metadata: Metadata = {
  title: { absolute: 'إحصائيات بورصة العراق · تدفق الأجانب وهيكل الملكية' },
  description: 'أرقام السوق العراقي شهرياً: صافي شراء وبيع المستثمرين الأجانب، دوران القطاعات، توزيع الملكية بين العراقيين والأجانب، وكبار المساهمين.',
  alternates: { canonical: 'https://iraqsm.com/statistics' },
  openGraph: {
    url: 'https://iraqsm.com/statistics',
    title: 'إحصائيات بورصة العراق · تدفق الأجانب وهيكل الملكية',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function StatisticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
