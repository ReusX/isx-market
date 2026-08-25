/**
 * The locale primitive.
 *
 * ── Why the URL is the only source of truth ───────────────────────────────
 * `AppContext` used to carry a `lang` field initialised from
 * `localStorage.getItem('lang')`. Nothing on the site rendered differently
 * because of it: it was a switch wired to nothing. Worse, a locale that lives
 * only in localStorage is invisible to a crawler, so the same URL would have
 * served two languages depending on who asked — the classic way to get an
 * entire language indexed under the wrong hreflang.
 *
 * Here the locale is a function of the pathname and nothing else. Arabic is
 * the site root (`/market`), English is prefixed (`/en/market`). Arabic is NOT
 * moved to `/ar`: every indexed Arabic URL keeps the address it already has,
 * which is the whole reason this shape was chosen over the symmetric one.
 *
 * ── Two root layouts, not one ─────────────────────────────────────────────
 * `lang` and `dir` must be real attributes on the served document, not a CSS
 * class applied after hydration. A single root layout cannot know the
 * pathname without `headers()`, and `headers()` makes every route dynamic —
 * which would take all 49 statically-rendered routes with it. So the app has
 * two root layouts under route groups, `app/(ar)` and `app/(en)`, each
 * rendering its own `<html>`. Both delegate to `components/shell/Document.tsx`
 * so the fonts, the theme bootstrap and the JSON-LD graph exist once.
 */

export const LOCALES = ['ar', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'ar'

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v)
}

/** `dir` for the document element. */
export function dirOf(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

/** `lang` for the document element. Bare `ar`, matching the live production tag. */
export function langOf(locale: Locale): string {
  return locale === 'ar' ? 'ar' : 'en'
}

/**
 * The hreflang token.
 *
 * Arabic is regionalised — this is Iraqi market data written for an Iraqi
 * reader, and `ar-IQ` says so. English is NOT regionalised: an English page
 * about the Iraq Stock Exchange is equally for a reader in London, Dubai or
 * Toronto, and `en-IQ` would wrongly narrow it.
 */
export function hreflangOf(locale: Locale): string {
  return locale === 'ar' ? 'ar-IQ' : 'en'
}

/** OpenGraph `locale`. */
export function ogLocaleOf(locale: Locale): string {
  return locale === 'ar' ? 'ar_IQ' : 'en_US'
}

/** The other locale. */
export function otherLocale(locale: Locale): Locale {
  return locale === 'ar' ? 'en' : 'ar'
}

/** The name of a locale, written in that locale — never a flag. */
export const LOCALE_NAME: Record<Locale, string> = { ar: 'العربية', en: 'English' }
