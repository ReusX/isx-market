/**
 * Iraqi vs foreign ownership split. The design ships a hardcoded donut; this
 * takes the real percentage and derives the arc from it.
 */
export function OwnershipDonut({
  foreignPct,
  compact = false,
}: {
  foreignPct: number
  compact?: boolean
}) {
  const pct = Number.isFinite(foreignPct) ? Math.max(0, Math.min(100, foreignPct)) : 0
  const iraqiPct = 100 - pct
  const circumference = 2 * Math.PI * 32
  const offset = circumference * (1 - pct / 100)

  return (
    <div className={`ownership-donut-row ${compact ? 'compact' : ''}`}>
      <svg
        className="ownership-donut"
        viewBox="0 0 80 80"
        role="img"
        aria-label={`ملكية عراقية ${iraqiPct.toFixed(1)}% وملكية أجنبية ${pct.toFixed(1)}%`}
      >
        <circle cx="40" cy="40" r="32" fill="none" stroke="#378ADD" strokeWidth="12" />
        <circle
          cx="40" cy="40" r="32" fill="none" stroke="#EF9F27" strokeWidth="12"
          strokeDasharray={circumference.toFixed(1)}
          strokeDashoffset={offset.toFixed(1)}
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="44" textAnchor="middle">{pct.toFixed(1)}%</text>
      </svg>
      <div className="ownership-legend">
        <span><i className="iraqi" />عراقي <bdi>{iraqiPct.toFixed(1)}%</bdi></span>
        <span><i className="foreign" />أجنبي <bdi>{pct.toFixed(1)}%</bdi></span>
      </div>
    </div>
  )
}
