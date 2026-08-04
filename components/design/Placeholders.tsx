/**
 * Loading placeholders whose job is to occupy the space the real content will
 * occupy — not to look busy.
 *
 * CrUX had the origin at CLS 0.59, six times the 0.1 threshold. Cause: every
 * price list is fetched in the browser, and the markup rendered while that was
 * in flight was SHORTER than the markup that replaced it. The homepage sent a
 * table with an empty <tbody> that became 25 rows, and three "no movement this
 * session" one-liners that became three rows each. On a phone that is well over
 * a thousand pixels of downward shove, arriving after first paint.
 *
 * These mirror the real markup structure rather than drawing a grey box, so the
 * reserved height tracks the actual row height — including on mobile, where the
 * table restacks into cards and a fixed pixel guess would be wrong.
 */

/** One table row of shimmer, matching the real row's cell structure. */
export function SkeletonTableRows({
  rows,
  columns,
  /** Same data-label values as the real row · mobile stacks cells by these. */
  labels = [],
  /** Whether the first content cell carries a logo chip (drives row height). */
  withLogo = true,
}: {
  rows: number
  columns: number
  labels?: string[]
  withLogo?: boolean
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="skeleton-row" aria-hidden="true">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} data-label={labels[c]}>
              {withLogo && c === 1 ? (
                <span className="company-cell">
                  {/* Not .skeleton-block · that one carries a 260x92 minimum
                      for hero blocks and would blow out a 30px chip. */}
                  <span className="logo-chip skeleton-fill" />
                  <span className="skeleton-stack">
                    <span className="skeleton-line" style={{ inlineSize: '9ch' }} />
                    <span className="skeleton-line short" style={{ inlineSize: '6ch' }} />
                  </span>
                </span>
              ) : (
                <span className="skeleton-line" style={{ inlineSize: c === 0 ? '2ch' : '5ch' }} />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/** Placeholder rows for a top-movers card. */
export function SkeletonMoverRows({ rows = 3 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div className="mover-row skeleton-row" key={i} aria-hidden="true">
          <span className="skeleton-stack">
            <span className="skeleton-line" style={{ inlineSize: '11ch' }} />
            <span className="skeleton-line short" style={{ inlineSize: '4ch' }} />
          </span>
          <span className="skeleton-line" style={{ inlineSize: '5ch' }} />
        </div>
      ))}
    </>
  )
}
