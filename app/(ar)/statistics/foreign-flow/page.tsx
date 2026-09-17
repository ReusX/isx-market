import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { ForeignFlowPage } from '@/components/site/ForeignFlowPage'
import { loadForeignFlow } from '@/lib/marketServer'

export const revalidate = 3600

const TITLE = 'التدفق الأجنبي في بورصة العراق · من يتداول ومن يدخل السوق'
const DESC = 'حصة المستثمرين غير العراقيين من الشراء والبيع في بورصة العراق جلسة بجلسة، صافي التدفق الأجنبي، أكثر الشركات شراءً وبيعاً، وحسابات مركز الإيداع حسب نوع المستثمر.'
export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: seoAlternates('/statistics/foreign-flow'),
  openGraph: { url: absUrl('/statistics/foreign-flow'), title: TITLE, description: DESC, images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}

/** /statistics/foreign-flow · who trades (Iraqis vs foreigners) and who is joining (depository accounts by type). */
export default async function Page() {
  return <ForeignFlowPage initial={await loadForeignFlow()} />
}
