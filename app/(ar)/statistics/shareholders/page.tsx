import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { BackHeader } from '../_ui'
import { ShareholdersFull } from '../MajorShareholdersPanel'

export const metadata: Metadata = {
  // Without this the page inherited the parent layout's canonical and
  // declared itself a duplicate of /statistics.
  alternates: seoAlternates('/statistics/shareholders'),
  // og:url must agree with the canonical; a share card pointing at a
  // different URL than the page claims to be is the same defect.
  openGraph: { url: absUrl('/statistics/shareholders'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
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
