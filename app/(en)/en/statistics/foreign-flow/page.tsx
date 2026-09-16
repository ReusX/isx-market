import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { ForeignFlowPage } from '@/components/site/ForeignFlowPage'
import { loadForeignFlow } from '@/lib/marketServer'

export const revalidate = 900

export const metadata: Metadata = {
  title: 'Foreign flow on the Iraq Stock Exchange · who trades and who is joining',
  description: 'Non-Iraqi investors\u2019 share of buying and selling on the Iraq Stock Exchange session by session, net foreign flow, the companies most bought and sold, and depository accounts by investor type.',
  alternates: seoAlternates('/statistics/foreign-flow', 'en'),
}

/** /statistics/foreign-flow · who trades (Iraqis vs foreigners) and who is joining (depository accounts by type). */
export default async function Page() {
  return <ForeignFlowPage initial={await loadForeignFlow()} />
}
