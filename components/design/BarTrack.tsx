export function BarTrack({
  value,
  max,
  tone = 'positive',
}: {
  value: number
  max: number
  tone?: 'positive' | 'negative' | 'neutral' | 'foreign'
}) {
  const width = Math.max(0, Math.min(100, (Math.abs(value) / Math.max(1, Math.abs(max))) * 100))
  return (
    <span className="bar-track" aria-hidden="true">
      <span className={tone} style={{ inlineSize: `${width}%` }} />
    </span>
  )
}
