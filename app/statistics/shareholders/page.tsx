import type { Metadata } from 'next'
import { BackHeader } from '../_ui'
import { ShareholdersFull } from '../MajorShareholdersPanel'

export const metadata: Metadata = {
  title: 'كبار المساهمين | بورصة العراق',
  description: 'أكبر الحصص في الشركات المدرجة بسوق العراق للأوراق المالية، مع الجنسية والنسبة والتغيّر عن الشهر السابق.',
}

export default function ShareholdersPage() {
  return (
    <main className="terminal-shell app-page statistics-detail-page">
      <BackHeader
        title="كبار المساهمين"
        subtitle="أكبر الحصص في الشركات المدرجة · النسبة والتغيّر عن الشهر السابق"
      />
      <ShareholdersFull />
    </main>
  )
}
