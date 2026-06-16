import type { Metadata } from 'next'
import { BackHeader, pageWrap } from '../_ui'
import { ShareholdersFull } from '../MajorShareholdersPanel'

export const metadata: Metadata = {
  title: 'كبار المساهمين | بورصة العراق',
  description: 'أكبر الحصص في الشركات المدرجة بسوق العراق للأوراق المالية، مع الجنسية والنسبة والتغيّر عن الشهر السابق.',
}

export default function ShareholdersPage() {
  return (
    <div style={pageWrap}>
      <BackHeader
        title="كبار المساهمين"
        subtitle="أكبر الحصص في الشركات المدرجة · النسبة والتغيّر عن الشهر السابق"
      />
      <ShareholdersFull />
    </div>
  )
}
