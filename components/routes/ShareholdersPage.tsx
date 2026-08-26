'use client'

import { BackHeader } from '@/app/(ar)/statistics/_ui'
import { ShareholdersFull } from '@/app/(ar)/statistics/MajorShareholdersPanel'
import { useLocale } from '@/context/LocaleContext'

/** /statistics/shareholders. See OwnershipPage for the pre-redesign note. */
export function ShareholdersPage() {
  const { t } = useLocale()
  const ow = t.ownership
  return (
    <main className="terminal-shell app-page statistics-detail-page">
      <BackHeader title={ow.shareholdersH1} subtitle={ow.shareholdersH1Sub} />
      <ShareholdersFull />
    </main>
  )
}
