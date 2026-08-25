/**
 * THE Arabic month names. One table for the whole product.
 *
 * ── Why these names, and not يناير/فبراير ─────────────────────────────────
 * Before this there were THREE tables: this one in pan-Arab form, a Levantine
 * one in lib/statistics.ts, and a third pan-Arab copy in the statistics route's
 * own _ui.tsx. /statistics used two of them at once, so the same page printed
 * «18 آب 2026» in one panel and «أغسطس 2026» in another. That is a shipped
 * defect, not merely an inconsistency between routes.
 *
 * Unified on the Iraqi/Levantine set, deliberately. This is a product for
 * Iraqi investors and its source of record is the ISX bulletin, which writes
 * dates this way; «آب» is what the reader sees on the document the numbers
 * come from. The brief's Arabic direction — «natural to an Iraqi reader» —
 * points the same way.
 *
 * ⚠ This changes dates on already-accepted surfaces (homepage, market,
 * company). It is one array, and reverting it is one edit.
 */
export const AR_MONTHS = [
  '', 'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول',
]

/**
 * Short forms, for a label that already sits inside a known year.
 *
 * ⚠ The reference writes four of these with Arabic-Indic digits («كانون٢»).
 * This repo's lint forbids them so that every figure on a page uses one
 * numeral system — Latin digits here, same as everywhere else.
 */
export const AR_MONTHS_SHORT = [
  '', 'كانون2', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين1', 'تشرين2', 'كانون1',
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

/**
 * A date that may be missing, formatted for `locale`.
 *
 * Returns «—» rather than an empty string when there is no date: the absence
 * has to be visible, and an empty string silently collapses the line it sits
 * on into something that looks like a layout bug.
 */
export function localeDateOrDash(raw: string | null | undefined, locale: 'ar' | 'en'): string {
  return raw ? localeDate(raw, locale) : '—'
}
