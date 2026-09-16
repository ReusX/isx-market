import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { ForeignFlowPage } from '@/components/site/ForeignFlowPage'
import { loadForeignFlow } from '@/lib/marketServer'

export const revalidate = 900

const TITLE = 'Foreign flow on the Iraq Stock Exchange · who trades and who is joining'
const DESC = 'Non-Iraqi investors\u2019 share of buying and selling on the Iraq Stock Exchange session by session, net foreign flow, the companies most bought and sold, and depository accounts by investor type.'
export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: seoAlternates('/statistics/foreign-flow', 'en'),
  openGraph: { url: absUrl('/statistics/foreign-flow', 'en'), title: TITLE, description: DESC, images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}

/** /statistics/foreign-flow · who trades (Iraqis vs foreigners) and who is joining (depository accounts by type). */
export default async function Page() {
  return <ForeignFlowPage initial={await loadForeignFlow()} />
}
