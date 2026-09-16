import type { Metadata } from 'next'
import { ScreenerPage } from '@/components/site/ScreenerPage'
import { loadScreener } from '@/lib/marketServer'
import { messages } from '@/lib/i18n'
import { absUrl, seoAlternates } from '@/lib/seo'

export const revalidate = 300

/**
 * /screener · presets first, conditions in the URL. A preset URL carries its
 * own title («أرخص الأسهم العراقية بالمكرر الربحي»), and its canonical is
 * itself; any other combination of filters canonicalises to the bare page.
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ preset?: string }> }): Promise<Metadata> {
  const { preset } = await searchParams
  const titles = messages('ar').screener.page.titles
  if (!preset || !titles[preset] || preset === 'all') return { alternates: seoAlternates('/screener', 'ar') }
  const path = `/screener?preset=${preset}`
  return { title: { absolute: titles[preset] }, alternates: seoAlternates(path, 'ar'), openGraph: { url: absUrl(path, 'ar'), title: titles[preset] } }
}

export default async function Page() {
  return <ScreenerPage initial={await loadScreener()} />
}
