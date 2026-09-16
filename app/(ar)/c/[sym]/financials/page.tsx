import companiesData from '@/public/data/companies.json'
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
  return <FinancialsPage initial={await loadFinancials(params.sym)} />
}
