import { getPosts, stripHtml } from '@/lib/cms'
import { guideSections } from '@/lib/tradingFromZero'
import { readingMinutes, type LearnItem, type LearnPath } from '@/lib/learn'
import { LearnIndex } from '@/components/routes/LearnIndex'
import { messages } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/locale'


// Title/description live in ./layout.tsx · a page-level `metadata` export wins
// over the layout's, so duplicating them here would quietly discard the
// canonical URL and the OG tags the layout sets.

/**
 * The beginner path, described from the guide's own content.
 *
 * The section count and the reading time are computed from
 * `lib/tradingFromZero.ts` rather than typed here, so the card cannot claim a
 * length the article does not have.
 */
function pathFor(locale: Locale): LearnPath {
  const sections = guideSections(locale)
  const t = messages(locale).learn
  return {
    href: '/learn/trading-from-zero',
    title: t.pathTitle,
    summary: t.pathSummary,
    sections: sections.length,
    // Computed from the guide's OWN text in that language, so the card cannot
    // claim a reading time the article does not have — and an English reading
    // time is measured on the English words, not inherited from the Arabic.
    minutes: readingMinutes(sections.map((s) => `${s.title} ${s.body}`).join(' ')),
  }
}

export async function LearnPageBody({ locale }: { locale: Locale }) {
  const { posts, ok } = await getPosts('learn', { perPage: 100 })

  const items: LearnItem[] = posts.map((p) => {
    const summary = stripHtml(p.excerpt?.rendered ?? '').trim()
    return {
      slug: p.slug,
      href: `/learn/${p.slug}`,
      title: stripHtml(p.title.rendered),
      summary: summary || null,
      // `modified` is a real WordPress field, so «آخر تحديث» is a real claim.
      updated: p.modified || p.date || null,
      minutes: readingMinutes(stripHtml(p.content?.rendered ?? '')),
    }
  })

  return <LearnIndex items={items} path={pathFor(locale)} libraryOk={ok} />
}
