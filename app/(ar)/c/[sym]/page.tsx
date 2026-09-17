import companiesData from '@/public/data/companies.json'
import { permanentRedirect } from 'next/navigation'
import { CompanyPage } from '@/components/site/CompanyPage'
import { loadCompany } from '@/lib/marketServer'

/**
 * ⚠ THE CACHING HERE IS THE POINT, not an afterthought.
 *
 * This route carried neither `revalidate` nor `generateStaticParams`, so all
 * 104 companies × 2 locales rendered dynamically on every view — and the old
 * component then queried Supabase from the browser AND called
 * /api/chart/[sym]. Two function invocations and a direct database read per
 * page view, against a Vercel Active CPU budget that was sitting at 91%.
 *
 * Now: prerendered per ticker, revalidating on the session's own cadence.
 */
export const revalidate = 3600
export const dynamicParams = true

export function generateStaticParams() {
  return (companiesData as { sym: string }[]).map((c) => ({ sym: c.sym }))
}

export default async function Page({ params }: { params: { sym: string } }) {
  /* Tickers are upper-case; a lower-case URL is the same page. Google had
     indexed both shapes, so this is a 301, not a canonical hint. */
  if (params.sym !== params.sym.toUpperCase()) permanentRedirect(`/c/${params.sym.toUpperCase()}`)
  return <CompanyPage initial={await loadCompany(params.sym)} />
}
