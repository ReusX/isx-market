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

const EN_MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * "2026-07-25" → "25 July 2026".
 *
 * Day-first, matching the Arabic side and the way the rest of the product
 * writes a date, rather than the US month-first order — this is a page about
 * Iraq, read mostly outside the United States, and the two orders are
 * ambiguous for the first twelve days of every month.
 *
 * `toLocaleDateString('en-…')` is avoided for the same reason the Arabic
 * helper avoids `ar-*`: the output would depend on the runtime's ICU data and
 * on the server's locale, so the same date could render differently in the
 * prerender and in the browser. This is a lookup table, so it cannot.
 */
export function enDate(raw: string): string {
  const [y, m, d] = raw.slice(0, 10).split(/[-/]/).map(Number)
  return EN_MONTHS[m] && d && y ? `${d} ${EN_MONTHS[m]} ${y}` : raw
}

/** `arDate` or `enDate`, chosen by locale. */
export function localeDate(raw: string, locale: 'ar' | 'en'): string {
  return locale === 'ar' ? arDate(raw) : enDate(raw)
}

/** Short form for dense chrome: "25 Jul" / "25 يوليو". No year. */
export function shortDate(raw: string, locale: 'ar' | 'en'): string {
  const [, m, d] = raw.slice(0, 10).split(/[-/]/).map(Number)
  if (!m || !d) return raw
  return locale === 'ar' ? `${d} ${AR_MONTHS[m]}` : `${d} ${EN_MONTHS[m].slice(0, 3)}`
}
