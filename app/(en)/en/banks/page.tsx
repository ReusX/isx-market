import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { BanksPage } from '@/components/site/BanksPage'
import { loadBanksHub } from '@/lib/banksServer'

/**
 * This replaces a legacy page that was Arabic-only, absent from navigation,
 * written in the pre-token design system, and carrying an unsourced claim —
 * it stated Rafidain lends "up to 25 million dinars" when the bank's own site
 * caps private-sector advances at 10 million.
 */
export const revalidate = 3600

export const metadata: Metadata = {
  alternates: seoAlternates('/banks', 'en'),
  openGraph: { url: absUrl('/banks', 'en'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  title: 'Iraqi Banks · Iraq Stock Exchange',
  description:
    'A directory of Iraqi banks: type, ownership and listing, and what each bank actually publishes about its deposits and loans — with the source and the date it was checked.',
}

export default async function Page() {
  return <BanksPage initial={await loadBanksHub()} />
}
