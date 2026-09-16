import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { messages } from '@/lib/i18n'
import { BankRatesPage } from '@/components/site/BankRatesPage'
import { loadBankRates } from '@/lib/banksServer'

/** `/banks/deposits` — the published deposits rates across every bank, compared. */
export const revalidate = 3600

export function generateMetadata(): Metadata {
  const r = messages('ar').banks.rates.deposits
  return {
    title: { absolute: r.seoTitle },
    description: r.seoDescription,
    alternates: seoAlternates('/banks/deposits'),
    openGraph: { url: absUrl('/banks/deposits'), title: r.seoTitle, description: r.seoDescription, images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  }
}

export default async function Page() {
  return <BankRatesPage family="deposits" initial={await loadBankRates('deposits')} />
}
