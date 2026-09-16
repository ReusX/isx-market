import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { ForeignFlowPage } from '@/components/site/ForeignFlowPage'
import { loadForeignFlow } from '@/lib/marketServer'

export const revalidate = 900

export const metadata: Metadata = {
  title: 'التدفق الأجنبي في بورصة العراق · من يتداول ومن يدخل السوق',
  description: 'حصة المستثمرين غير العراقيين من الشراء والبيع في بورصة العراق جلسة بجلسة، صافي التدفق الأجنبي، أكثر الشركات شراءً وبيعاً، وحسابات مركز الإيداع حسب نوع المستثمر.',
  alternates: seoAlternates('/statistics/foreign-flow'),
}

/** /statistics/foreign-flow · who trades (Iraqis vs foreigners) and who is joining (depository accounts by type). */
export default async function Page() {
  return <ForeignFlowPage initial={await loadForeignFlow()} />
}
