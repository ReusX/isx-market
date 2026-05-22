import type { Metadata } from 'next'
import companiesData from '@/public/data/companies.json'

const BASE = 'https://iraqsm.com'

interface Props {
  params: { sym: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: { params: { sym: string } }): Promise<Metadata> {
  const sym = params.sym.toUpperCase()
  const company = (companiesData as { sym: string; ar: string; en: string; sec?: string }[])
    .find(c => c.sym === sym)

  if (!company) {
    return {
      title: `${sym} | ISX Market`,
      description: `سعر سهم ${sym} في بورصة العراق للأوراق المالية.`,
    }
  }

  const title = `${company.en} (${sym}) | ISX Market — بورصة العراق`
  const description = `سعر سهم ${company.ar} (${sym}) مباشرة من بورصة العراق. ${company.en} live share price, charts and data on Iraq Stock Exchange (ISX).`
  const url = `${BASE}/c/${sym}`

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'ISX Market',
      locale: 'ar_IQ',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default function CompanyLayout({ children }: Props) {
  return children
}
