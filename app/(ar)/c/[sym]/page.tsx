import companiesData from '@/public/data/companies.json'
import CompanyProfile from '@/components/company/CompanyProfile'
import { getQuote } from '@/lib/quote'
import { CompanyDetail } from '@/components/routes/CompanyDetail'

/**
 * A server shell, so the profile prose below the fold stays in the
 * server-rendered HTML. It used to live in the layout, which also wraps
 * /c/[sym]/financials — publishing the same body under two URLs.
 */
export default async function CompanyPage({ params }: { params: { sym: string } }) {
  const sym = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string; sec?: string; mcap?: number }[])
    .find(c => c.sym === sym)
  const quote = company ? await getQuote(sym) : null

  return (
    <>
      <CompanyDetail sym={sym} />
      {company ? (
        <CompanyProfile
          sym={sym}
          en={company.en}
          ar={company.ar}
          sec={company.sec}
          mcap={company.mcap}
          quote={quote}
        />
      ) : null}
    </>
  )
}
