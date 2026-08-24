import { getPosts, stripHtml } from '@/lib/cms'
import { GUIDE_SECTIONS } from '@/lib/tradingFromZero'
import { readingMinutes, type LearnItem, type LearnPath } from '@/lib/learn'
import { LearnClient } from './LearnClient'

export const revalidate = 300

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
const PATH: LearnPath = {
  href: '/learn/trading-from-zero',
  title: 'تعلم تداول الأسهم من الصفر',
  summary: 'دليل المبتدئين: ما هي بورصة العراق، كيف تبدأ، وكيف تقرأ سعر السهم.',
  sections: GUIDE_SECTIONS.length,
  minutes: readingMinutes(GUIDE_SECTIONS.map((s) => `${s.title} ${s.body}`).join(' ')),
}

export default async function LearnPage() {
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

  return <LearnClient items={items} path={PATH} libraryOk={ok} />
}
