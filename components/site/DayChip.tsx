/**
 * The up/down chip beside a headline price: the move since the previous
 * close, in the same `id-chg` pill the oil and silver heroes use.
 *
 * `invert` is for exchange rates. A dearer dollar (or euro) is a weaker
 * dinar, so a rise takes the "down" colour, as the /fx history panel
 * already shows it. Gold and the commodities keep rise = up.
 */
export function DayChip({ pct, abs, fmt, unit = '', invert = false, label }: {
  pct: number | null | undefined
  abs?: number | null
  fmt?: (v: number) => string
  unit?: string
  invert?: boolean
  label: string
}) {
  if (pct == null || !Number.isFinite(pct)) return null
  /* `label` is the hover text; the page also prints it in the date line, so
     the number itself stays what a screen reader hears. */
  /* Two decimals of a percent is the resolution the sources quote at; below
     that a move is noise, and calling it "up" would be a claim. */
  const p = Math.round(pct * 100) / 100
  const dir = p > 0 ? 1 : p < 0 ? -1 : 0
  const cls = dir === 0 ? 'is-flat' : (dir > 0) !== invert ? 'is-up' : 'is-down'
  const sign = (v: number) => (v > 0 ? '+' : '')
  return (
    <span className={`id-chg ${cls}`} title={label}>
      <bdi>
        {abs != null && fmt && dir !== 0 ? `${sign(abs)}${fmt(abs)}${unit} · ` : ''}
        {sign(p)}{p.toFixed(2)}%
      </bdi>
    </span>
  )
}
