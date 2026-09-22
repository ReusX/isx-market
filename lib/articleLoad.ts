import { getArticle, listArticles, stripHtml, articlePath, type Section } from '@/lib/articles'
import { outlineBody, plainText } from '@/lib/article'
import { arDate } from '@/lib/date'
type ArticleNeighbour = { slug: string; title: string; href: string }

/**
 * The shared loader behind /news/[slug], /research/[slug] and /learn/[slug].
 *
 * All three ask the library the same two questions — «this article» and «the
 * rest of this section» — and need the same answers in the same shape. One
 * place, so the article pages cannot drift into different display rules.
 *
 * Neighbours and related come from the real section list (newest-first), so
 * previous/next are simply the adjacent entries and «مقالات ذات صلة» are the
 * nearest others — no relevance model is implied.
 */
export type LoadedArticle = {
  title: string
  standfirst: string | null
  author: string | null
  dateLabel: string | null
  dateTime: string | null
  image: string | null
  bodyHtml: string
  layout: 'article' | 'guide'
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
  section: Section, slug: string,
): Promise<LoadedArticle | null> {
  const post = getArticle(slug, section)
  if (!post) return null

  const { html, headings } = outlineBody(post.html)
  const list = listArticles(section)

  const asNeighbour = (p: { slug: string; title: string }): ArticleNeighbour => ({
    slug: p.slug,
    title: plainText(p.title),
    href: articlePath(section, p.slug),
  })

  const at = list.findIndex((p) => p.id === post.id)
  const author = post.author.trim()

  /**
   * The standfirst is dropped when it merely repeats the opening of the body
   * (WordPress auto-excerpts were the first ~55 words plus an ellipsis, and
   * printing that above the body printed the same sentence twice).
   */
  const excerptRaw = plainText(stripHtml(post.excerpt))
  const bodyOpening = plainText(stripHtml(post.html)).slice(0, 400)
  const stem = excerptRaw.replace(/[….\s\[\]]+$/, '').slice(0, 90)
  const excerpt = stem && bodyOpening.startsWith(stem) ? '' : excerptRaw

  return {
    title: plainText(post.title),
    standfirst: excerpt || null,
    author: author || null,
    dateLabel: post.date ? dateLine(post.date) : null,
    dateTime: post.date || null,
    image: post.image,
    bodyHtml: html,
    layout: post.layout,
    headings,
    // Newest-first, so the entry BEFORE this one is the newer article.
    prev: at > 0 ? asNeighbour(list[at - 1]) : null,
    next: at >= 0 && at < list.length - 1 ? asNeighbour(list[at + 1]) : null,
    related: list.filter((p) => p.id !== post.id).slice(0, 4).map(asNeighbour),
  }
}
