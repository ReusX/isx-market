import { ForeignFlowPage } from '@/components/site/ForeignFlowPage'
import { loadForeignFlow } from '@/lib/marketServer'

export const revalidate = 900

/** /statistics/foreign-flow · who trades (Iraqis vs foreigners) and who is joining (depository accounts by type). */
export default async function Page() {
  return <ForeignFlowPage initial={await loadForeignFlow()} />
}
