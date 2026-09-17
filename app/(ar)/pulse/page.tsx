import { PulsePage } from '@/components/site/PulsePage'
import { loadPulse } from '@/lib/marketServer'

// Title/description live in ./layout.tsx. Shared with /en/pulse.
//
// ⚠ This used to be `revalidate = 300` over a component that fetched
// everything in the browser, so ISR regenerated an empty shell: a crawler got
// the module headings and not one of the numbers under them, on a page whose
// own title promises «الأسهم الصاعدة والهابطة». The model now loads here.
export const revalidate = 3600

export default async function Page() {
  return <PulsePage initial={await loadPulse()} />
}
