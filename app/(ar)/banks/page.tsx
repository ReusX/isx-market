import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { BanksHub, type HubBank } from '@/components/routes/BanksHub'
import { listBanks, listProducts, listServices, bankFinancials, coverageOf } from '@/lib/banks'
import { editorialFor } from '@/lib/bankEditorial'

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
  const [banks, products, services] = await Promise.all([listBanks(), listProducts(), listServices()])
  const fin = await bankFinancials(banks.map((b) => b.ticker).filter(Boolean) as string[])
  const rows: HubBank[] = banks.map((bank) => {
    const p = products.filter((x) => x.bank_slug === bank.slug)
    return {
      bank, products: p,
      services: services.filter((x) => x.bank_slug === bank.slug),
      coverage: coverageOf(bank, p),
      financials: bank.ticker ? fin.get(bank.ticker) : undefined,
      editorial: editorialFor(bank.slug),
    }
  })
  return <BanksHub rows={rows} />
}
