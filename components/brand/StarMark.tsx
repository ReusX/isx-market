/**
 * IQWealth brand mark · the eight-pointed Star of Ishtar.
 *
 * Single source of truth for the mark. `public/favicon.svg` carries the same
 * geometry (generated from the same 8-point construction: outer r=37, waist
 * r=14.3, centre hole r=9 on a 96×96 box) — if you retune one, retune both.
 *
 * The star and the hole are one path with `fill-rule: evenodd`, so the centre
 * punches through to whatever sits behind it rather than being painted a fixed
 * colour. That is what lets the mark sit on any surface, light or dark.
 */
export const STAR_PATH =
  'M 48.00 11.00 L 53.47 34.79 L 74.16 21.84 L 61.21 42.53 L 85.00 48.00 ' +
  'L 61.21 53.47 L 74.16 74.16 L 53.47 61.21 L 48.00 85.00 L 42.53 61.21 ' +
  'L 21.84 74.16 L 34.79 53.47 L 11.00 48.00 L 34.79 42.53 L 21.84 21.84 ' +
  'L 42.53 34.79 Z ' +
  'M 39.00 48.00 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0 Z'

export function StarMark({
  size = 22,
  color = 'currentColor',
  className,
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path fillRule="evenodd" fill={color} d={STAR_PATH} />
    </svg>
  )
}

export default StarMark
