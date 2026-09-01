import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { absUrl, seoAlternates } from '@/lib/seo'
import { BankProfile } from '@/components/routes/BankProfile'
import {
  getBank, listBanks, listProducts, listServices, productDetail, bankFinancials, coverageOf,
} from '@/lib/banks'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  return (await listBanks()).map((b) => ({ slug: b.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const bank = await getBank(slug)
  if (!bank) return {}
  return {
    alternates: seoAlternates(`/banks/${slug}`, 'en'),
    openGraph: { url: absUrl(`/banks/${slug}`, 'en'), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
    title: `${bank.name_en} · Bank profile and products`,
    description: `${bank.name_en}: type, ownership and services, plus published deposits and loans with their terms — each with a source and a verification date.`,
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bank = await getBank(slug)
  if (!bank) notFound()
  const [products, services] = await Promise.all([listProducts(slug), listServices(slug)])
  const { facts, conditions } = await productDetail(products.map((p) => p.id))
  const fin = bank.ticker ? (await bankFinancials([bank.ticker])).get(bank.ticker) ?? null : null
  return (
    <BankProfile
      bank={bank} products={products} facts={facts} conditions={conditions}
      services={services} financials={fin} coverage={coverageOf(bank, products)}
    />
  )
}
