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
  alternates: seoAlternates('/banks'),
  openGraph: { url: absUrl('/banks'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
  title: 'المصارف العراقية · بورصة العراق',
  description:
    'دليل المصارف العراقية: النوع والملكية والإدراج، وما ينشره كل مصرف فعلاً عن ودائعه وقروضه — مع المصدر وتاريخ التحقق.',
}

export default async function Page() {
  return <BanksPage initial={await loadBanksHub()} />
}
