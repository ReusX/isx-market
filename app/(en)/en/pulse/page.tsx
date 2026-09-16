import { PulsePage } from '@/components/site/PulsePage'
import { loadPulse } from '@/lib/marketServer'

export const revalidate = 900

export default async function Page() {
  return <PulsePage initial={await loadPulse()} />
}
