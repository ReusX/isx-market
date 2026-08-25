import { absUrl } from '@/lib/seo'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/locale'

/**
 * BreadcrumbList structured data.
 *
 * Google renders these in place of the raw URL line above a result, so a hit
 * reads "IQWealth › الشركات › اسياسيل" instead of "iraqsm.com › c › TASC". It
 * is one of the few snippet elements that is actually deterministic — unlike
 * sitelinks, which are chosen algorithmically and cannot be requested.
 *
 * Only /gold, /oil and /fx had this. Every other page showed the bare path.
 *
 * Emits markup only, no visible trail: the sidebar already shows where you are,
 * and a second redundant trail on every page would be clutter. Google accepts
 * BreadcrumbList without a rendered counterpart.
 *
 * ── Locale ────────────────────────────────────────────────────────────────
 * `path` is the LOCALE-FREE route; the `item` URL is built for `locale`. An
 * English page whose breadcrumb pointed at the Arabic URL would be telling
 * Google the two are the same document, which is the one thing the canonical
 * and hreflang work exists to prevent. Names are passed in already translated,
 * because a breadcrumb name is copy.
 */
export default function Breadcrumbs({
  trail,
  locale = DEFAULT_LOCALE,
}: {
  /** Root excluded — it is prepended here so every page agrees on it. */
  trail: { name: string; path: string }[]
  locale?: Locale
}) {
  const items = [{ name: 'IQWealth', path: '/' }, ...trail]

  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absUrl(item.path, locale),
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}
