import companiesData from '@/public/data/companies.json'
import { CompanyPage } from '@/components/site/CompanyPage'
import { loadCompany } from '@/lib/marketServer'

// See the Arabic route for why the caching here matters.
export const revalidate = 900
export const dynamicParams = true

export function generateStaticParams() {
  return (companiesData as { sym: string }[]).map((c) => ({ sym: c.sym }))
}

export default async function Page({ params }: { params: { sym: string } }) {
  return <CompanyPage initial={await loadCompany(params.sym)} />
}
