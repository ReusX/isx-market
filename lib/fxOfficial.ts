/**
 * The official rate — read from the Central Bank, not asserted.
 *
 * ── What was here before ──────────────────────────────────────────────────
 * A single constant, `CBI_OFFICIAL_RATE = 1320`, with a hand-entered
 * confirmation date and a comment explaining that a policy rate has nothing to
 * scrape. The second half of that was wrong: cbi.iq publishes its rate table
 * in plain static HTML, and the figure it publishes is 1,310 — the rate at
 * which it sells dollars to commercial banks.
 *
 * 1,320 is not invented. It is roughly what a person pays at a counter once
 * bank compliance costs are added. But `/fx` printed it under «السعر الرسمي»
 * and computed the gap from it, which attributed to the Central Bank a number
 * the Central Bank does not publish, and made the headline gap +225 / +17.0%
 * where the issuer's own rate gives +235 / +17.9%.
 *
 * So: three separate concepts, each with its own label and its own source.
 * See lib/fxSeries.ts for why the spread is defined against exactly one.
 *
 * ── Fallbacks ────────────────────────────────────────────────────────────
 * The constants below are last-known-good values, used only when the scrape
 * fails. They are not the primary path any more, and each carries the date it
 * was last confirmed so a stale fallback is visible rather than silent.
 */

/** CBI-published rate. Last confirmed against cbi.iq on the date below. */
export const CBI_OFFICIAL_RATE = 1310
export const CBI_RATE_CONFIRMED = '2026-08-31'

/** The statutory rate in the federal budget. Changed by legislation, not by a
 *  market, so there is genuinely nothing to poll. */
export const STATUTORY_RATE = 1300
export const STATUTORY_CONFIRMED = '2026-08-31'

/** What a customer effectively pays at a bank once compliance costs land.
 *  Widely quoted, real, and NOT the CBI's number — it must never be labelled
 *  «السعر الرسمي». Left null until a source we can cite is wired up; the page
 *  simply omits the row rather than printing an unsourced figure. */
export const EFFECTIVE_BANK_RATE: number | null = null

const CBI_URL = 'https://cbi.iq/'
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; IraqSM/1.0; +https://iraqsm.com)' }

export interface OfficialQuote {
  rate: number
  sourceUrl: string
  excerpt: string
}

/**
 * Read the USD row out of the CBI homepage table.
 *
 * The page renders every currency as `<name> <CODE> <value>` in the document
 * text, so the parse anchors on the ISO code rather than on markup that a
 * redesign would change. A rate outside a wide sanity band is treated as a
 * misparse, not as news — the official rate has moved twice in a decade, so a
 * sudden 900 or 4,000 is a broken selector, not a devaluation.
 */
export function parseCbiRate(raw: string, url = CBI_URL): OfficialQuote | null {
  const t = raw
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
  const m = t.match(/USD\s+([\d,]+(?:\.\d+)?)/)
  if (!m) return null
  const rate = parseFloat(m[1].replace(/,/g, ''))
  if (!Number.isFinite(rate) || rate < 900 || rate > 3000) return null
  const at = t.indexOf(m[0])
  return { rate, sourceUrl: url, excerpt: t.slice(Math.max(0, at - 60), at + 80).trim() }
}

export async function fetchCbiOfficial(): Promise<OfficialQuote | null> {
  try {
    const res = await fetch(CBI_URL, {
      headers: UA,
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return null
    return parseCbiRate(await res.text())
  } catch {
    return null
  }
}
