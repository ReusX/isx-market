// WordPress headless CMS integration

/**
 * Where the CMS lives — and, in production, ONLY where it is configured to.
 *
 * This used to be `process.env.WP_API_URL ?? '<hostinger preview host>'`. The
 * fallback was added while cms.iraqsm.com DNS propagated, and it quietly became
 * a production dependency: with the variable unset, the live site would serve
 * every article from a temporary preview host without anything saying so.
 *
 * Now the fallback is a LOCAL convenience only. In production the variable must
 * be set; when it is not, this returns null and the callers below take the same
 * unavailable path they already take for an outage — `ok: false` on the list,
 * `null` on a single post — so /news degrades to the CMS-unavailable state
 * instead of silently reading from the wrong origin, and nothing crashes.
 */
const DEV_FALLBACK_ORIGIN = 'https://paleturquoise-deer-610016.hostingersite.com'

function cmsOrigin(): string | null {
  const configured = process.env.WP_API_URL?.trim().replace(/\/$/, '')
  if (configured) return configured
  return process.env.NODE_ENV === 'production' ? null : DEV_FALLBACK_ORIGIN
}

export interface WPPost {
  id:             number
  slug:           string
  date:           string
  modified:       string
  title:          { rendered: string }
  excerpt:        { rendered: string }
  content:        { rendered: string }
  featured_media: number
  categories:     number[]
  tags:           number[]
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string; alt_text: string; media_details?: { sizes?: Record<string, { source_url: string }> } }>
    author?:             Array<{ name: string; avatar_urls?: Record<string, string> }>
    'wp:term'?:          Array<Array<{ id: number; name: string; slug: string }>>
  }
}

export const CATEGORY_IDS = {
  news:     2,
  research: 3,
  learn:    4,
} as const

export type Section = keyof typeof CATEGORY_IDS

const BASE_FIELDS = 'id,slug,date,modified,title,excerpt,content,featured_media,categories,tags,_embedded'

// ── Fetch list of posts for a section ────────────────────────────────────────
export async function getPosts(
  section: Section,
  { page = 1, perPage = 12 }: { page?: number; perPage?: number } = {}
): Promise<{ posts: WPPost[]; total: number; totalPages: number; ok: boolean }> {
  const catId = CATEGORY_IDS[section]
  const WP = cmsOrigin()
  if (!WP) return { posts: [], total: 0, totalPages: 0, ok: false }
  try {
    const res = await fetch(
      `${WP}/wp-json/wp/v2/posts?categories=${catId}&page=${page}&per_page=${perPage}&_embed=1&_fields=${BASE_FIELDS}&orderby=date&order=desc`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return { posts: [], total: 0, totalPages: 0, ok: false }
    const posts = await res.json()
    return {
      posts,
      total:      parseInt(res.headers.get('X-WP-Total') ?? '0'),
      totalPages: parseInt(res.headers.get('X-WP-TotalPages') ?? '0'),
      // `ok` separates "the CMS answered, and this section is empty" from "the
      // CMS did not answer". Without it both arrive as `posts: []` and a
      // section page cannot tell an empty library from an outage — which are
      // different facts and owe the reader different screens.
      ok: true,
    }
  } catch {
    return { posts: [], total: 0, totalPages: 0, ok: false }
  }
}

// ── Fetch single post by slug ─────────────────────────────────────────────────
export async function getPost(slug: string): Promise<WPPost | null> {
  const WP = cmsOrigin()
  if (!WP) return null
  try {
    const res = await fetch(
      `${WP}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=1`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    const posts: WPPost[] = await res.json()
    return posts[0] ?? null
  } catch {
    return null
  }
}

// ── Featured image URL ────────────────────────────────────────────────────────
// Rewrites cms.iraqsm.com URLs → Hostinger temp domain so images work
// regardless of DNS propagation state for the WP media files
function rewriteImgUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url
    .replace('https://cms.iraqsm.com', 'https://paleturquoise-deer-610016.hostingersite.com')
    .replace('http://cms.iraqsm.com',  'https://paleturquoise-deer-610016.hostingersite.com')
}

export function featuredImage(post: WPPost, size = 'medium_large'): string | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0]
  if (media) {
    const url =
      media.media_details?.sizes?.[size]?.source_url
      ?? media.media_details?.sizes?.['large']?.source_url
      ?? media.media_details?.sizes?.['medium_large']?.source_url
      ?? media.media_details?.sizes?.['medium']?.source_url
      ?? media.source_url
      ?? null
    return rewriteImgUrl(url)
  }
  // fallback: extract first real image URL from post content.
  // Hostinger lazy-load plugin puts real URL in data-src, so check that first.
  const html = post.content?.rendered ?? ''
  const m = html.match(/\bdata-src="(https?:\/\/[^"]+)"/)
    ?? html.match(/\bsrc="(https?:\/\/[^"]+)"/)
  return m?.[1] ?? null
}

// ── Author name ───────────────────────────────────────────────────────────────
export function authorName(post: WPPost): string {
  return post._embedded?.author?.[0]?.name ?? ''
}

// ── Format date ───────────────────────────────────────────────────────────────
export function fmtDate(dateStr: string, lang: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(
      lang === 'ar' ? 'ar-IQ' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    )
  } catch {
    return dateStr
  }
}

// ── Strip HTML tags for plain text excerpt ───────────────────────────────────
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
}

// ── Section metadata ──────────────────────────────────────────────────────────
export const SECTIONS = {
  news: {
    icon: '📰',
    labelAr: 'الأخبار',
    labelEn: 'News',
    descAr: 'آخر أخبار بورصة العراق',
    descEn: 'Latest Iraq Stock Exchange news',
    color: '#4F6BFF',
  },
  research: {
    icon: '🔍',
    labelAr: 'الأبحاث',
    labelEn: 'Research',
    descAr: 'تحليلات وتقارير السوق',
    descEn: 'Market analysis & research reports',
    color: '#A855F7',
  },
  learn: {
    icon: '📚',
    labelAr: 'تعلّم',
    labelEn: 'Learn',
    descAr: 'دليلك للاستثمار في بورصة العراق',
    descEn: 'Your guide to investing in the ISX',
    color: '#22C55E',
  },
} as const
