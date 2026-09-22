import 'server-only'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { marked } from 'marked'

/**
 * The article library — files in content/articles/<section>/*.md.
 *
 * This replaced the headless WordPress on 2026-09-18. Every post the CMS held
 * was exported verbatim (scripts/wp-export.mjs) at its original URL, so nothing
 * Google had indexed moved. New articles are written here as Markdown; the
 * exported ones carry `format: html` and are rendered exactly as they arrived.
 *
 * Frontmatter is deliberately tiny — `key: value` lines, strings in JSON quotes
 * when they need it — so no YAML dependency is pulled into the server bundle.
 */
/**
 * Callout directives, for guides that are read in a hurry.
 *
 * A guide can wrap part of its body in `:::cta` … `:::` (or `check`, `steps`,
 * `warn`, `info`, `qa`) and the loader turns that region into a styled box.
 * Markdown inside is rendered normally — the directive only wraps it — so the
 * prose stays plain text in the file and a heading keeps its place in the
 * outline. `:::qa` is the exception: each `h3` inside it becomes a collapsed
 * `<details>`, which is what turns a wall of troubleshooting into something a
 * reader can scan on a phone (the FAQ structured data reads `summary` too).
 */
const CALLOUTS = ['cta', 'check', 'steps', 'warn', 'info', 'qa'] as const

const md = (src: string) => marked.parse(src, { async: false, gfm: true }) as string

function qaAccordion(inner: string): string {
  return inner.split(/(?=<h3[^>]*>)/).map((part) => {
    const m = /^<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*)$/.exec(part)
    return m ? `<details class="qa"><summary>${m[1]}</summary><div class="qa-body">${m[2]}</div></details>` : part
  }).join('')
}

/**
 * Render Markdown, turning `:::kind` regions into callout boxes.
 *
 * The split happens on the SOURCE, not the rendered HTML: Markdown folds a
 * marker line into the paragraph that follows it, so by the time it is HTML the
 * boundary is gone. Each region is rendered on its own and wrapped.
 */
const REGION = /^:::([a-z]+)[ \t]*\r?\n([\s\S]*?)\r?\n:::[ \t]*$/gm

function renderBody(src: string): string {
  let out = '', last = 0
  for (const m of Array.from(src.matchAll(REGION))) {
    const kind = m[1]
    if (!(CALLOUTS as readonly string[]).includes(kind)) continue
    out += md(src.slice(last, m.index))
    const inner = md(m[2])
    out += `<div class="cal cal-${kind}">${kind === 'qa' ? qaAccordion(inner) : inner}</div>`
    last = (m.index ?? 0) + m[0].length
  }
  return out + md(src.slice(last))
}

export type Section = 'news' | 'research' | 'learn'
export const SECTIONS: Section[] = ['news', 'research', 'learn']

export interface Article {
  id: number
  section: Section
  /** Decoded slug — the Arabic words, not the percent-encoded form. */
  slug: string
  title: string
  excerpt: string
  html: string
  /** ISO datetimes with offset. */
  date: string
  modified: string
  author: string
  image: string | null
  tags: string[]
  tickers: string[]
  /** Evergreen guides are refreshed in place; the feed treats them differently from dated news. */
  evergreen: boolean
  /** `guide` opts into the larger, boxed reading layout (see styles/news-page.css). */
  layout: 'article' | 'guide'
}

const ROOT = path.join(process.cwd(), 'content', 'articles')

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!m) return { meta: {}, body: raw }
  const meta: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i < 0) continue
    const key = line.slice(0, i).trim()
    let val = line.slice(i + 1).trim()
    if (val.startsWith('"')) { try { val = JSON.parse(val) } catch { /* keep raw */ } }
    meta[key] = val
  }
  return { meta, body: raw.slice(m[0].length) }
}

const list = (v?: string) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)

function load(section: Section, file: string): Article | null {
  const raw = readFileSync(path.join(ROOT, section, file), 'utf8')
  const { meta, body } = parseFrontmatter(raw)
  if (!meta.slug || !meta.title || !meta.date) return null
  const html = meta.format === 'html' ? body.trim() : renderBody(body)
  const image = meta.image || html.match(/<img[^>]*\ssrc="([^"]+)"/)?.[1] || null
  return {
    id: Number(meta.id) || 0,
    section,
    slug: meta.slug,
    title: meta.title,
    excerpt: meta.excerpt ?? '',
    html,
    date: meta.date,
    modified: meta.modified || meta.date,
    author: meta.author ?? '',
    image,
    tags: list(meta.tags),
    tickers: list(meta.tickers).map((t) => t.toUpperCase()),
    evergreen: meta.evergreen === 'true',
    layout: meta.layout === 'guide' ? 'guide' : 'article',
  }
}

/* Read once per server process in production — the files only change with a
   deploy. In development every request re-reads, so a saved draft shows up. */
const cache = new Map<Section, Article[]>()
const CACHED = process.env.NODE_ENV === 'production'

/** A section, newest first (by `modified` for evergreen pieces, `date` otherwise). */
export function listArticles(section: Section): Article[] {
  const hit = CACHED ? cache.get(section) : undefined
  if (hit) return hit
  let files: string[] = []
  try { files = readdirSync(path.join(ROOT, section)).filter((f) => f.endsWith('.md')) } catch { /* no such section yet */ }
  const items = files.map((f) => load(section, f)).filter((a): a is Article => !!a)
  const sortKey = (a: Article) => (a.evergreen ? a.modified : a.date)
  items.sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
  cache.set(section, items)
  return items
}

/** Look a slug up in one section, or across all of them. Accepts the encoded form too. */
export function getArticle(slug: string, section?: Section): Article | null {
  let wanted = slug
  try { wanted = decodeURIComponent(slug) } catch { /* not encoded */ }
  for (const s of section ? [section] : SECTIONS) {
    const hit = listArticles(s).find((a) => a.slug === wanted)
    if (hit) return hit
  }
  return null
}

/**
 * The public path of an article. Percent-encoding is emitted in LOWERCASE
 * (`%d8%a3…`) because that is the form WordPress minted and Google indexed;
 * `encodeURIComponent` alone would emit `%D8%A3…`, which is equivalent by RFC
 * but not byte-identical to the URLs already in the index.
 */
export function articlePath(section: Section, slug: string): string {
  return `/${section}/${encodeURIComponent(slug).replace(/%[0-9A-F]{2}/g, (h) => h.toLowerCase())}`
}

/** Strip tags for plain-text excerpts and titles. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}
