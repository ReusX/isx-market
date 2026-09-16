import companiesData from '@/public/data/companies.json'
import { FinancialsPage } from '@/components/site/FinancialsPage'
import { loadFinancials } from '@/lib/marketServer'

/** `/en/c/[sym]/financials` — see the Arabic route. */
export const revalidate = 3600
export const dynamicParams = true

export function generateStaticParams() {
  return (companiesData as { sym: string }[]).map((c) => ({ sym: c.sym }))
}

export default async function Page({ params }: { params: { sym: string } }) {
  return <FinancialsPage initial={await loadFinancials(params.sym)} />
}
