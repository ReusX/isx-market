import { getArticle, listArticles, stripHtml, articlePath, isOwnArticle, type Section } from '@/lib/articles'
import { outlineBody, plainText } from '@/lib/article'
import { arDate } from '@/lib/date'
import { articleFigures, coverTopic } from '@/lib/articleFigures'
type ArticleNeighbour = { slug: string; title: string; href: string; cover?: { image: string | null; topic: string } }

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
  /** The routes of the site's own figures the story talks about; the first
   *  is also the topic its drawn cover falls back to (lib/articleFigures). */
  figures: string[]
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
  /* News offers only our own pieces as neighbours and «more stories»; an
     imported story still renders, but points readers to what we write. */
  const all = listArticles(section)
  const list = section === 'news' ? all.filter((p) => isOwnArticle(p) || p.id === post.id) : all

  const figuresOf = (p: { title: string; excerpt: string; tags: string[]; tickers: string[] }) => articleFigures(`${p.title} ${p.excerpt} ${p.tags.join(' ')}`, p.tickers)
  const asNeighbour = (p: { slug: string; title: string; excerpt: string; tags: string[]; tickers: string[]; image: string | null }): ArticleNeighbour => ({
    slug: p.slug,
    title: plainText(p.title),
    href: articlePath(section, p.slug),
    cover: { image: p.image || null, topic: coverTopic(figuresOf(p)) },
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
    figures: figuresOf(post),
    bodyHtml: html,
    layout: post.layout,
    headings,
    // Newest-first, so the entry BEFORE this one is the newer article.
    prev: at > 0 ? asNeighbour(list[at - 1]) : null,
    next: at >= 0 && at < list.length - 1 ? asNeighbour(list[at + 1]) : null,
    related: list.filter((p) => p.id !== post.id).slice(0, 4).map(asNeighbour),
  }
}
