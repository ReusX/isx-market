import { absUrl } from '@/lib/seo'
import { plainText } from '@/lib/article'
import type { Article } from '@/lib/articles'
import { articlePath } from '@/lib/articles'

/**
 * Structured data for a written article.
 *
 * `Article` for a guide, `NewsArticle` for dated reporting — Google treats the
 * two differently and an evergreen «أفضل البنوك» piece is not news. When the
 * body ends in a «الأسئلة الشائعة» section written as h3 question / paragraph
 * answer pairs, a `FAQPage` node is derived from those exact words.
 */
export function articleJsonLd(a: Article, bodyHtml: string) {
  const url = absUrl(articlePath(a.section, a.slug))
  const node: Record<string, unknown> = {
    '@type': a.evergreen ? 'Article' : 'NewsArticle',
    headline: a.title,
    description: plainText(a.excerpt),
    datePublished: a.date,
    dateModified: a.modified,
    inLanguage: 'ar',
    mainEntityOfPage: url,
    author: a.author
      ? { '@type': 'Person', name: a.author, worksFor: { '@type': 'Organization', name: 'IQWealth' } }
      : { '@type': 'Organization', name: 'IQWealth', url: absUrl('/') },
    publisher: { '@type': 'Organization', name: 'IQWealth', url: absUrl('/'), logo: { '@type': 'ImageObject', url: absUrl('/icon.png') } },
    image: [a.image ? absUrl(a.image) : absUrl('/opengraph-image')],
  }
  const faq = faqPairs(bodyHtml)
  const graph: unknown[] = [node]
  if (faq.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, ans]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: ans } })),
    })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

function faqPairs(html: string): [string, string][] {
  const start = html.search(/<h2[^>]*>\s*الأسئلة الشائعة/)
  if (start < 0) return []
  const tail = html.slice(start)
  const out: [string, string][] = []
  for (const m of Array.from(tail.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*((?:<p>[\s\S]*?<\/p>\s*)+)/g))) {
    const q = plainText(m[1]), ans = plainText(m[2])
    if (q && ans) out.push([q, ans])
  }
  return out
}
