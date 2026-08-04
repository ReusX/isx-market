import type { Metadata } from 'next'
import companiesData from '@/public/data/companies.json'
import Freshness from '@/components/seo/Freshness'
import Breadcrumbs from '@/components/seo/Breadcrumbs'

// Counted rather than hardcoded · the number is the reason to click, and a
// stale one is worse than none.
const TOTAL = (companiesData as unknown[]).length

export const metadata: Metadata = {
  title: { absolute: `الشركات المدرجة في بورصة العراق · ${TOTAL} شركة حسب القطاع` },
  description: `دليل كامل لجميع الشركات المدرجة في بورصة العراق للأوراق المالية (${TOTAL} شركة) مرتّبة حسب القطاع — المصارف، الاتصالات، الصناعة، التأمين والزراعة.`,
  alternates: { canonical: 'https://iraqsm.com/companies' },
  keywords: [
    'iraq stock exchange companies', 'isx listed companies', 'iraq stock market companies',
    'الشركات المدرجة في بورصة العراق', 'اسهم العراق', 'سوق الاسهم العراقي',
    'شركات البورصة العراقية', 'بورصة العراق',
  ],
  openGraph: {
    url: 'https://iraqsm.com/companies',
    title: 'الشركات المدرجة في بورصة العراق',
    description: 'All companies listed on the Iraq Stock Exchange (ISX). الشركات المدرجة في بورصة العراق للأوراق المالية.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function CompaniesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <Breadcrumbs trail={[{ name: 'الشركات', path: '/companies' }]} />

      <Freshness
        url="https://iraqsm.com/companies"
        name="الشركات المدرجة في بورصة العراق"
        description="دليل الشركات المدرجة في بورصة العراق للأوراق المالية حسب القطاع."
      />
    </>
  )
}
