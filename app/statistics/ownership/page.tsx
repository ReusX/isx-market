import type { Metadata } from 'next'
import { BackHeader, pageWrap } from '../_ui'
import { OwnershipFull } from '../OwnershipPanel'

export const metadata: Metadata = {
  title: 'هيكل الملكية · عراقي مقابل أجنبي | بورصة العراق',
  description: 'توزيع رأس المال المودع بين المستثمرين العراقيين والأجانب لكل شركة مدرجة في سوق العراق للأوراق المالية.',
}

export default function OwnershipPage() {
  return (
    <div style={pageWrap}>
      <BackHeader
        title="هيكل الملكية · عراقي مقابل أجنبي"
        subtitle="توزيع رأس المال المودع بين المستثمرين العراقيين والأجانب"
      />
      <OwnershipFull />
    </div>
  )
}
