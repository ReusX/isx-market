import { LearnHome, type LearnHomeData } from '@/components/learn/LearnHome'
import { loadStreet } from '@/lib/moneyStreet'
import type { Locale } from '@/lib/i18n/locale'

// Title/description live in ./layout.tsx · a page-level `metadata` export wins
// over the layout's, so duplicating them here would quietly discard the
// canonical URL and the OG tags the layout sets.

/** /learn and /en/learn: the Learn platform's home (components/learn/LearnHome). */
export async function LearnPageBody({ locale }: { locale: Locale }) {
  void locale // the page reads its language from LocaleContext, like every other route
  return <LearnHome data={await stripData()} />
}

/** The comic strip's two real numbers: what a million dinars bought in the
 *  street's first year (CBI official rate) and what it buys today (market). */
async function stripData(): Promise<LearnHomeData> {
  try {
    const d = await loadStreet()
    const first = d.years[0]
    return first && d.now.usdSell ? { then: { year: first.year, usd: first.usd }, nowUsd: d.now.usdSell } : null
  } catch { return null }
}
