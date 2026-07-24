'use client'

import { type CSSProperties, type KeyboardEvent, type ReactNode, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EmptyState } from './ui'

export type TableColumn<Row> = {
  key: string
  label: ReactNode
  render: (row: Row) => ReactNode
  sortValue?: (row: Row) => number | string
  className?: string
  /** Wrap this cell in the row link so crawlers and middle-click both work. */
  linked?: boolean
}

export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  rowHref,
  gridTemplateColumns,
  minWidth,
  initialSort,
  loading = false,
  emptyTitle = 'لا توجد نتائج',
  emptyDescription = 'غيّر معايير البحث لعرض بيانات أخرى.',
}: {
  rows: Row[]
  columns: TableColumn<Row>[]
  rowKey: (row: Row) => string
  rowHref?: (row: Row) => string
  gridTemplateColumns?: string
  minWidth?: string
  initialSort?: { key: string; direction: 'asc' | 'desc' }
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}) {
  const router = useRouter()
  const firstSortable = columns.find(column => column.sortValue)
  const [sortKey, setSortKey] = useState(initialSort?.key ?? firstSortable?.key ?? '')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSort?.direction ?? 'desc')

  const sortedRows = useMemo(() => {
    const column = columns.find(item => item.key === sortKey)
    if (!column?.sortValue) return rows
    return [...rows].sort((a, b) => {
      const aValue = column.sortValue?.(a) ?? 0
      const bValue = column.sortValue?.(b) ?? 0
      const result = typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue), 'ar')
      return sortDirection === 'asc' ? result : -result
    })
  }, [columns, rows, sortDirection, sortKey])

  function sortBy(column: TableColumn<Row>) {
    if (!column.sortValue) return
    if (column.key === sortKey) {
      setSortDirection(direction => (direction === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(column.key)
    setSortDirection('desc')
  }

  const tableStyle = {
    ['--table-columns' as string]: gridTemplateColumns ?? `repeat(${columns.length}, minmax(0, 1fr))`,
    ['--table-min-width' as string]: minWidth ?? '620px',
  } as CSSProperties

  function openRow(event: KeyboardEvent<HTMLDivElement>, href: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      router.push(href)
    }
  }

  if (loading) {
    return (
      <div className="shared-data-grid is-loading" style={tableStyle} aria-busy="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="shared-data-grid-row" key={i}>
            {columns.map(column => (
              <div className={column.className} key={column.key}>
                <span className="skeleton-block" />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />

  return (
    <div className="shared-data-grid" role="table" style={tableStyle}>
      <div className="shared-data-grid-head" role="rowgroup">
        <div className="shared-data-grid-row" role="row">
          {columns.map(column => (
            <div className={column.className} key={column.key} role="columnheader">
              {column.sortValue ? (
                <button type="button" onClick={() => sortBy(column)}>
                  {column.label}
                  {sortKey === column.key ? (
                    <span className="sort-chevron" aria-hidden="true">{sortDirection === 'asc' ? '⌃' : '⌄'}</span>
                  ) : null}
                </button>
              ) : column.label}
            </div>
          ))}
        </div>
      </div>
      <div role="rowgroup">
        {sortedRows.map(row => {
          const href = rowHref?.(row)
          return (
            <div
              className={href ? 'shared-data-grid-row clickable' : 'shared-data-grid-row'}
              key={rowKey(row)}
              role="row"
              tabIndex={href ? 0 : undefined}
              // Client-side navigation, not a full document load: the linked
              // cell below carries the real <a> for crawlers and middle-click.
              onClick={href ? () => router.push(href) : undefined}
              onKeyDown={href ? event => openRow(event, href) : undefined}
            >
              {columns.map(column => (
                <div
                  className={column.className}
                  data-label={typeof column.label === 'string' ? column.label : undefined}
                  key={column.key}
                  role="cell"
                >
                  {href && column.linked ? (
                    <Link className="grid-cell-link" href={href} tabIndex={-1}>{column.render(row)}</Link>
                  ) : column.render(row)}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
