import { getLastSessionDate, freshnessJsonLd } from '@/lib/freshness'
import { localeDate } from '@/lib/date'
import { DEFAULT_LOCALE, hreflangOf, type Locale } from '@/lib/i18n/locale'

/**
 * Emits both halves of the freshness signal for a data page: schema.org
 * `dateModified`, and a visible "آخر تحديث" line.
 *
 * The visible line matters as much as the markup. Google prefers a date it can
 * see in the rendered page over one it can only read in JSON-LD, and a reader
 * landing on a price page wants the same thing — the two interests point the
 * same way here.
 *
 * Server component on purpose: it must be in the HTML a crawler receives, which
 * is exactly what the client-side price tables are not.
 *
 * ── Locale ────────────────────────────────────────────────────────────────
 * The visible line was Arabic for everyone, which put «آخر تحديث للبيانات» at
 * the foot of every English data page — the one sentence on the page whose
 * whole job is to be read and believed. `inLanguage` is emitted too, so the
 * dataset markup does not claim an English page is Arabic.
 */
export default async function Freshness({
  url,
  name,
  description,
  locale = DEFAULT_LOCALE,
}: {
  url: string
  name: string
  description: string
  locale?: Locale
}) {
  const modified = await getLastSessionDate()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            ...freshnessJsonLd({ url, name, description, modified }),
            inLanguage: hreflangOf(locale),
          }),
        }}
      />
      {modified ? (
        <p className="page-freshness">
          {locale === 'ar' ? 'آخر تحديث للبيانات: ' : 'Data last updated: '}
          <time dateTime={modified}><bdi>{localeDate(modified, locale)}</bdi></time>
          {locale === 'ar'
            ? ' · المصدر: نشرة بورصة العراق الرسمية'
            : ' · Source: the official Iraq Stock Exchange bulletin'}
        </p>
      ) : null}
    </>
  )
}
