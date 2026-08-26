'use client'
import { useLocale } from '@/context/LocaleContext'

/**
 * Active / suspended split for any company listing.
 *
 * Replaces the "show suspended" checkbox that /screener shipped with. The
 * checkbox framed the ~40 dormant names as an optional extra on the live board;
 * they are really a separate population — different meaning, different useful
 * columns — so they get their own tab and the counts are stated up front.
 */
export type ListingStatus = 'active' | 'suspended'

export function ListingStatusTabs({
  value,
  onChange,
  activeCount,
  suspendedCount,
}: {
  value: ListingStatus
  onChange: (next: ListingStatus) => void
  activeCount: number
  suspendedCount: number
}) {
  const { t } = useLocale()
  const tabs = [
    { id: 'active' as const, label: t.chart.index.trading, count: activeCount },
    { id: 'suspended' as const, label: t.chart.index.suspended, count: suspendedCount },
  ]

  return (
    <div
      className="listing-status-tabs"
      role="tablist"
      aria-label={t.chart.index.listingStatus}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          className={value === tab.id ? 'active' : ''}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          <bdi className="listing-status-count">{tab.count}</bdi>
        </button>
      ))}
    </div>
  )
}

export default ListingStatusTabs
