/**
 * تعلّم — the Learn system's real shape.
 *
 * ══ WHAT ACTUALLY EXISTS, AND WHAT DOES NOT ═══════════════════════════════
 * Two sources, and only two:
 *
 *   WordPress category 4    the article library. As of this writing it holds
 *                           ZERO posts — the CMS answers, and the section is
 *                           genuinely empty. That is a product decision (the
 *                           owner writes the content later), not an outage,
 *                           and the page says so rather than inventing rows.
 *
 *   /learn/trading-from-zero
 *                           the one real long-form guide. NOT from the CMS —
 *                           a hand-written static page with six titled
 *                           sections. It is the beginner entry point.
 *
 * ── The taxonomy the approved design shows, and why it is not here ────────
 * The reference Learn page carries a topic filter over four labels («تصنيف
 * أول» … «تصنيف رابع») that are marked in its own source as DESIGN
 * PLACEHOLDERS. `CATEGORY_IDS` defines exactly three categories, one per
 * SECTION — news 2, research 3, learn 4 — there is no sub-taxonomy inside
 * Learn, and `getPosts` cannot filter by tag. Shipping four invented topic
 * chips would decide the content strategy by default and would filter over a
 * field that does not exist. The filter is therefore omitted; the search,
 * which runs over real titles and excerpts, is kept.
 *
 * ── Reading time ──────────────────────────────────────────────────────────
 * NOT a stored CMS field. It is derived from the body length here, which is
 * deterministic and repeatable, and it is the only derived number on these
 * pages. Nothing else is inferred: difficulty, level, series, prerequisites
 * and lesson order do not exist in the data and are not displayed.
 */

import { localeDate } from '@/lib/date'

/** ~180 words a minute, floored at one. Arabic prose, measured on the body. */
export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 180))
}

export type LearnItem = {
  slug: string
  href: string
  title: string
  summary: string | null
  updated: string | null
  minutes: number
}

/**
 * The beginner path · the live static guide, described from its own content.
 *
 * Section count and reading time are computed from the page's real sections
 * in `app/learn/trading-from-zero/page.tsx` and passed in, rather than being
 * typed here where they could drift from the article.
 */
export type LearnPath = {
  href: string
  title: string
  summary: string
  sections: number
  minutes: number
}

/** Search over what the CMS really returns: the title and the excerpt. */
export function filterLearn(items: LearnItem[], query: string): LearnItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((i) =>
    i.title.toLowerCase().includes(q) || (i.summary ?? '').toLowerCase().includes(q))
}

/**
 * An Arabic date for a real timestamp, or `null` when there is none.
 *
 * Returns null rather than a dash: the caller decides whether an absent date
 * means "omit the line" or "say it is unavailable", and those differ by
 * surface. The formatting itself goes through `lib/date` — `toLocaleDateString`
 * with an `ar-*` locale emits Arabic-Indic digits and Iraqi month names, which
 * is not how this product writes a date anywhere else.
 */
export function learnDate(iso: string | null | undefined, locale: 'ar' | 'en' = 'ar'): string | null {
  if (!iso) return null
  const day = iso.slice(0, 10)
  const out = localeDate(day, locale)
  return out === day && !/^\d{4}-\d{2}-\d{2}$/.test(day) ? null : out
}
