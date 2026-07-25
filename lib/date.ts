export const AR_MONTHS = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

/**
 * "2026-07-25" / "2026/07/25" → "25 يوليو 2026", the way the design writes
 * dates. Anything it cannot parse comes back untouched.
 */
export function arDate(raw: string): string {
  const [y, m, d] = raw.slice(0, 10).split(/[-/]/).map(Number)
  return AR_MONTHS[m] && d && y ? `${d} ${AR_MONTHS[m]} ${y}` : raw
}
