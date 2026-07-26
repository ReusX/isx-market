/**
 * The one place numbers and dates become text.
 *
 * Arabic RTL punishes ad-hoc formatting in three specific ways, and each of
 * them shipped to production at least once before this module existed:
 *
 *  1. A sign written next to a bare number lands on the wrong side under bidi
 *     — "5.41%+" instead of "+5.41%". Anything signed has to sit inside a
 *     `<bdi>`; use `<ChangeValue>` / `<DirectionalChange>` from
 *     components/design/ui, or wrap `pct()` yourself.
 *  2. An Arabic magnitude word does the same to the value it qualifies
 *     ("مليون 11.4-"), so magnitudes stay Latin: K/M/B/T.
 *  3. `toLocaleDateString('ar-IQ')` renders Arabic-Indic digits and Iraqi month
 *     names, neither of which matches the design or the Latin figures beside
 *     it. Use `arDate` from lib/date.
 *
 * Labels follow the same rule as the figures they sit next to: write "52 أسبوع",
 * not "٥٢ أسبوع".
 */

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** Grouped integer: 12,400,000. */
export const num = (v: number | null | undefined): string => (v == null ? '·' : plain.format(v))

/** Compact Latin magnitude: 12.4M. Never ألف/مليون/مليار — see (2) above. */
export const compactNum = (v: number | null | undefined): string => (v == null ? '·' : compact.format(v))

/** Compact dinars: "12.4M IQD". */
export const iqd = (v: number | null | undefined): string => (v == null ? '·' : `${compact.format(v)} IQD`)

/**
 * Signed percentage, e.g. "+5.41%". The caller is responsible for putting it in
 * a `<bdi>` — prefer the ChangeValue component, which does both.
 */
export const pct = (v: number | null | undefined, decimals = 2): string =>
  (v == null ? '·' : `${v > 0 ? '+' : ''}${v.toFixed(decimals)}%`)

/** Price with the market's usual precision. */
export const price = (v: number | null | undefined, decimals = 2): string =>
  (v == null ? '·' : v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }))

export { arDate } from './date'
