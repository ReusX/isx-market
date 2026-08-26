'use client'

import { BackHeader } from '@/app/(ar)/statistics/_ui'
import { OwnershipFull } from '@/app/(ar)/statistics/OwnershipPanel'
import { useLocale } from '@/context/LocaleContext'

/**
 * /statistics/ownership.
 *
 * ⚠ Still on PRE-REDESIGN chrome — carried forward rather than rebuilt, and
 * recorded as such in the report. This pass gave it the copy and the locale
 * layer; the visual work is a separate job.
 */
export function OwnershipPage() {
  const { t } = useLocale()
  const ow = t.ownership
  return (
    <main className="terminal-shell app-page statistics-detail-page">
      <BackHeader title={ow.ownershipH1} subtitle={ow.ownershipSub} />
      <OwnershipFull />
    </main>
  )
}
