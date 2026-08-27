import { getPost, getPosts, featuredImage, authorName, stripHtml, type Section } from '@/lib/cms'
import { outlineBody, plainText } from '@/lib/article'
import { arDate } from '@/lib/date'
import type { ArticleNeighbour } from '@/components/article/ArticleView'

/**
 * The shared loader behind /news/[slug] and /learn/[slug].
 *
 * Both routes ask the CMS the same two questions — «this article» and «the
 * rest of this section» — and both need the same answers turned into the same
 * shape. Keeping it in one place is what stops the two article pages drifting
 * into two different sets of rules about what may be displayed.
 *
 * ── Neighbours and related come from the real list ────────────────────────
 * `getPosts` returns the section newest-first, so previous/next are simply the
 * neighbours of this slug in that order and «مقالات ذات صلة» are the nearest
 * others. There is no relevance model behind it and none is implied: the label
 * on the News side says «المزيد من الأخبار», which is what the list actually
 * is. Nothing is shown at all if the section list could not be read.
 */
export type LoadedArticle = {
  title: string
  standfirst: string | null
  author: string | null
  dateLabel: string | null
  dateTime: string | null
  image: string | null
  bodyHtml: string
  headings: ReturnType<typeof outlineBody>['headings']
  related: ArticleNeighbour[]
  prev: ArticleNeighbour | null
  next: ArticleNeighbour | null
}

/* `lib/date` and nothing else: `toLocaleDateString` with an `ar-*` locale
   emits Arabic-Indic digits and Iraqi month names, which no other date in this
   product uses. */
const dateLine = (iso: string): string | null => {
  const day = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? arDate(day) : null
}

export async function loadArticle(
  section: Section, slug: string, base: string,
): Promise<LoadedArticle | null> {
  const post = await getPost(slug)
  if (!post) return null

  const { html, headings } = outlineBody(post.content?.rendered ?? '')
  const { posts, ok } = await getPosts(section, { perPage: 100 })

  const asNeighbour = (p: { slug: string; title: { rendered: string } }): ArticleNeighbour => ({
    slug: p.slug,
    title: plainText(p.title.rendered),
    href: `${base}/${p.slug}`,
  })

  const list = ok ? posts : []
  /**
   * Matched on the post ID, never on the slug.
   *
   * WordPress stores an Arabic slug percent-ENCODED — `%d8%a3%d8%b3…` — while
   * Next hands `params.slug` back DECODED, so `p.slug === slug` is false for
   * every Arabic article. The visible symptom was quiet and wrong in both
   * directions: previous/next disappeared, and the article listed ITSELF under
   * «المزيد من الأخبار», because the filter that was meant to exclude it never
   * matched either.
   */
  const at = list.findIndex((p) => p.id === post.id)
  const author = authorName(post).trim()

  /**
   * The standfirst is dropped when WordPress generated it.
   *
   * An editor-written excerpt is a real standfirst and earns its place under
   * the headline. An AUTO excerpt is just the first ~55 words of the body with
   * an ellipsis, so printing it above the body prints the same sentence twice
   * — which is what this article does on the live CMS. Comparing the excerpt
   * against the opening of the body is the only signal available: the REST API
   * exposes no flag saying which one it is.
   */
  const excerptRaw = plainText(stripHtml(post.excerpt?.rendered ?? ''))
  const bodyOpening = plainText(stripHtml(post.content?.rendered ?? '')).slice(0, 400)
  const stem = excerptRaw.replace(/[….\s\[\]]+$/, '').slice(0, 90)
  const excerpt = stem && bodyOpening.startsWith(stem) ? '' : excerptRaw

  return {
    title: plainText(post.title.rendered),
    standfirst: excerpt || null,
    author: author || null,
    dateLabel: post.date ? dateLine(post.date) : null,
    dateTime: post.date || null,
    image: featuredImage(post, 'large'),
    bodyHtml: html,
    headings,
    // Newest-first, so the entry BEFORE this one is the newer article.
    prev: at > 0 ? asNeighbour(list[at - 1]) : null,
    next: at >= 0 && at < list.length - 1 ? asNeighbour(list[at + 1]) : null,
    related: list.filter((p) => p.id !== post.id).slice(0, 4).map(asNeighbour),
  }
}
