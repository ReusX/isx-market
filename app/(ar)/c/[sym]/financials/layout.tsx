import type { Metadata } from 'next'
import companiesData from '@/public/data/companies.json'
import { buildCompanySeo } from '@/lib/companySeo'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
import { absUrl, seoAlternates } from '@/lib/seo'

const ARABIC_NAMES = (companiesData as { ar: string }[]).map(c => c.ar).filter(Boolean)

/**
 * ⚠ ADDED · this route had no metadata of its own.
 *
 * It inherited `app/(ar)/c/[sym]/layout.tsx`, whose canonical is `/c/[sym]` —
 * so every financials page in the product was telling Google it was a
 * duplicate of the company overview, and asking to be dropped from the index.
 * It now self-canonicalises, and its title and description describe the
 * statements table rather than the share price.
 *
 * No «اليوم» and no price line: this page is a set of published filings, not a
 * quote, and its snippet should not compete with the overview page's.
 */
export async function generateMetadata({ params }: { params: { sym: string } }): Promise<Metadata> {
  const sym     = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string }[]).find(c => c.sym === sym)
  const seo     = buildCompanySeo(sym, company?.ar ?? sym, company?.en ?? sym, undefined, ARABIC_NAMES)
  const name    = seo.shortAr

  return {
    title: { absolute: `القوائم المالية لشركة ${name} · ${sym} في بورصة العراق` },
    description:
      `قائمة الدخل والمركز المالي والنسب المالية لشركة ${name} (${sym})، مستخرجة من التقارير المنشورة لدى هيئة الأوراق المالية العراقية وتُعرض كما وردت.`,
    alternates: seoAlternates(`/c/${sym}/financials`),
    openGraph: {
      url: absUrl(`/c/${sym}/financials`),
      title: `القوائم المالية لشركة ${name} · ${sym}`,
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
      locale: 'ar_IQ',
    },
  }
}

export default function FinancialsLayout({ children, params }: { children: React.ReactNode; params: { sym: string } }) {
  const sym = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string }[]).find(c => c.sym === sym)
  const seo = buildCompanySeo(sym, company?.ar ?? sym, company?.en ?? sym, undefined, ARABIC_NAMES)

  return (
    <>
      {children}
      <Breadcrumbs
        trail={[
          { name: 'السوق', path: '/market' },
          { name: seo.shortAr, path: `/c/${sym}` },
          { name: 'البيانات المالية', path: `/c/${sym}/financials` },
        ]}
      />
    </>
  )
}
