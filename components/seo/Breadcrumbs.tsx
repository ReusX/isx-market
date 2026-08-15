import { SITE } from '@/lib/seo'
const BASE = SITE

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
 */
export default function Breadcrumbs({
  trail,
}: {
  /** Root excluded — it is prepended here so every page agrees on it. */
  trail: { name: string; path: string }[]
}) {
  const items = [{ name: 'IQWealth', path: '/' }, ...trail]

  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${BASE}${item.path === '/' ? '' : item.path}`,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}
