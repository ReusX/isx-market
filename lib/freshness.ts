/**
 * Server-side "how fresh is this page" signal.
 *
 * Google was stamping the market pages with three-week-old dates ("Jul 9, 2026"
 * on a page whose headline promise is اليوم). It had nothing better to go on:
 * every price table fetches in the browser, so the HTML a crawler receives
 * contains no date at all, and the sitemap claims `lastModified: now` on every
 * URL every time — which Google discounts precisely because it is always now.
 * Left with neither, it fell back to its own crawl date.
 *
 * This reads the real date of the latest ISX bulletin we hold and lets the data
 * pages state it, both as visible text and as schema.org `dateModified`.
 *
 * Deliberately a bare `fetch` against PostgREST rather than the Supabase server
 * client: that one reads `cookies()`, which opts the route out of static
 * rendering entirely. This keeps the pages static with ISR.
 */

import { SITE } from '@/lib/seo'

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** ISO date (YYYY-MM-DD) of the most recent trading session we have, or null. */
export async function getLastSessionDate(): Promise<string | null> {
  if (!URL_BASE || !ANON) return null
  try {
    const res = await fetch(
      `${URL_BASE}/rest/v1/daily_prices?select=date&order=date.desc&limit=1`,
      {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
        // Half an hour: the bulletin lands once a day, so this is only about
        // how fast a new session shows up, not about load.
        next: { revalidate: 1800 },
      },
    )
    if (!res.ok) return null
    const rows = (await res.json()) as { date?: string }[]
    return rows?.[0]?.date ?? null
  } catch {
    // Freshness is an enhancement — a page without it still renders.
    return null
  }
}

/**
 * schema.org WebPage carrying a real `dateModified`, for the data pages.
 *
 * `dateModified` is the whole point; `datePublished` is deliberately omitted
 * rather than faked, since these pages have no meaningful publication date.
 */
export function freshnessJsonLd({
  url,
  name,
  description,
  modified,
}: {
  url: string
  name: string
  description: string
  modified: string | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': url,
    url,
    name,
    description,
    inLanguage: 'ar-IQ',
    isPartOf: { '@id': `${SITE}/#website` },
    ...(modified ? { dateModified: modified } : {}),
  }
}
