import companiesData from '@/public/data/companies.json'
import { permanentRedirect } from 'next/navigation'
import { FinancialsPage } from '@/components/site/FinancialsPage'
import { freeFinancials, loadFinancials } from '@/lib/marketServer'

/**
 * Prerendered per ticker like `/c/[sym]`; a filing changes a few times a
 * year, so the page and its loader both ask for a day. The [sym] layout's
 * quote (30 min) still sets the real floor; before, the loader's 60-second
 * fetch did, and crawlers walking every ticker made that an ISR-write bill. The old page was a client component that
 * queried three tables from the browser on every view.
 */
export const revalidate = 86400
export const dynamicParams = true

export function generateStaticParams() {
  return (companiesData as { sym: string }[]).map((c) => ({ sym: c.sym }))
}

export default async function Page(props: { params: Promise<{ sym: string }> }) {
  const params = await props.params;
  /* Tickers are upper-case; a lower-case URL is the same page. Google had
     indexed both shapes, so this is a 301, not a canonical hint. */
  if (params.sym !== params.sym.toUpperCase()) permanentRedirect(`/c/${params.sym.toUpperCase()}/financials`)
  /* Only the free part goes into the page; «برو» readers load the rest (/api/pro/financials). */
  const initial = await loadFinancials(params.sym)
  return <FinancialsPage initial={initial.fin ? { ...initial, fin: freeFinancials(initial.fin) } : initial} />
}
