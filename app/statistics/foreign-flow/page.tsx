import type { Metadata } from 'next'
import { BackHeader } from '../_ui'
import { DailyForeignFlowFull } from '../DailyForeignFlow'

export const metadata: Metadata = {
  title: 'تدفق المستثمر الأجنبي اليوم | بورصة العراق',
  description: 'صافي شراء وبيع المستثمرين غير العراقيين لكل شركة في سوق العراق للأوراق المالية، محدّث يومياً مع نشرة التداول.',
}

export default function ForeignFlowPage() {
  return (
    <main className="terminal-shell app-page statistics-detail-page">
      <BackHeader
        title="تدفق المستثمر الأجنبي اليوم" live
        subtitle="صافي شراء/بيع غير العراقيين لكل شركة · يُحدَّث يومياً مع نشرة التداول"
      />
      <DailyForeignFlowFull />
    </main>
  )
}
