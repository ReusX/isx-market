import companiesData from '@/public/data/companies.json'
import { permanentRedirect } from 'next/navigation'
import { FinancialsPage } from '@/components/site/FinancialsPage'
import { loadFinancials } from '@/lib/marketServer'

/**
 * Prerendered per ticker like `/c/[sym]`; a filing changes a few times a
 * year, so an hour is generous. The old page was a client component that
 * queried three tables from the browser on every view.
 */
export const revalidate = 3600
export const dynamicParams = true

export function generateStaticParams() {
  return (companiesData as { sym: string }[]).map((c) => ({ sym: c.sym }))
}

export default async function Page({ params }: { params: { sym: string } }) {
  /* Tickers are upper-case; a lower-case URL is the same page. Google had
     indexed both shapes, so this is a 301, not a canonical hint. */
  if (params.sym !== params.sym.toUpperCase()) permanentRedirect(`/c/${params.sym.toUpperCase()}/financials`)
  return <FinancialsPage initial={await loadFinancials(params.sym)} />
}
