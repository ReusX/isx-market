import companiesData from '@/public/data/companies.json'
import { permanentRedirect } from 'next/navigation'
import { CompanyPage } from '@/components/site/CompanyPage'
import { freeFlow, loadCompany } from '@/lib/marketServer'

// See the Arabic route for why the caching here matters.
export const revalidate = 3600
export const dynamicParams = true

export function generateStaticParams() {
  return (companiesData as { sym: string }[]).map((c) => ({ sym: c.sym }))
}

export default async function Page(props: { params: Promise<{ sym: string }> }) {
  const params = await props.params;
  /* Tickers are upper-case; a lower-case URL is the same page. Google had
     indexed both shapes, so this is a 301, not a canonical hint. */
  if (params.sym !== params.sym.toUpperCase()) permanentRedirect(`/en/c/${params.sym.toUpperCase()}`)
  /* Foreign flow: the last sessions are free; «برو» readers load the history (/api/pro/flow). */
  const initial = await loadCompany(params.sym)
  return <CompanyPage initial={{ ...initial, flow: freeFlow(initial.flow) }} />
}
