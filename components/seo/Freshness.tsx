import { getLastSessionDate, freshnessJsonLd } from '@/lib/freshness'
import { arDate } from '@/lib/date'

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
 */
export default async function Freshness({
  url,
  name,
  description,
}: {
  url: string
  name: string
  description: string
}) {
  const modified = await getLastSessionDate()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(freshnessJsonLd({ url, name, description, modified })),
        }}
      />
      {modified ? (
        <p className="page-freshness">
          آخر تحديث للبيانات: <time dateTime={modified}><bdi>{arDate(modified)}</bdi></time>
          {' · '}المصدر: نشرة بورصة العراق الرسمية
        </p>
      ) : null}
    </>
  )
}
