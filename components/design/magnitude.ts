// Colour-by-magnitude helper from the design package (was app/marketData.ts).
// Kept as a genuinely shared module so the heatmap, sector chips, change values
// and treemap all encode intensity identically instead of each re-deriving it.

export function changeMagnitude(change: number) {
  // Monotonic by construction: increasing |change| can only increase (or cap) intensity.
  return Math.max(0.12, Math.min(1, Math.abs(change) / 3))
}

export function changeToneStyle(change: number) {
  return {
    ['--change-mix' as string]: `${55 + changeMagnitude(change) * 45}%`,
  }
}

export type SectorDatum = {
  name: string
  change: number
  value: number
}
