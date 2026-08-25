import type { Metadata } from 'next'
import companiesData from '@/public/data/companies.json'
import { buildCompanySeoEn } from '@/lib/companySeo'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'

/** `/en/c/[sym]/financials`. See the Arabic layout for why this file exists. */
export async function generateMetadata({ params }: { params: { sym: string } }): Promise<Metadata> {
  const sym     = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string }[]).find(c => c.sym === sym)
  const seo     = buildCompanySeoEn(sym, company?.ar ?? '', company?.en ?? sym)
  const name    = seo.shortAr

  return {
    title: { absolute: `${name} (${sym}) financial statements · Iraq Stock Exchange` },
    description:
      `Income statement, balance sheet and financial ratios for ${name} (${sym}), extracted from the reports published to the Iraq Securities Commission and shown as reported.`,
    alternates: seoAlternates(`/c/${sym}/financials`, 'en'),
    openGraph: {
      url: absUrl(`/c/${sym}/financials`, 'en'),
      title: `${name} (${sym}) financial statements`,
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
      locale: 'en_US',
      alternateLocale: 'ar_IQ',
    },
  }
}

export default function EnFinancialsLayout({ children, params }: { children: React.ReactNode; params: { sym: string } }) {
  const sym = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string }[]).find(c => c.sym === sym)
  const seo = buildCompanySeoEn(sym, company?.ar ?? '', company?.en ?? sym)

  return (
    <>
      {children}
      <Breadcrumbs
        locale="en"
        trail={[
          { name: 'Market', path: '/market' },
          { name: seo.shortAr, path: `/c/${sym}` },
          { name: 'Financials', path: `/c/${sym}/financials` },
        ]}
      />
    </>
  )
}
