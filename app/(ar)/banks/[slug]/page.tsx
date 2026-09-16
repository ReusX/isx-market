import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { absUrl, seoAlternates } from '@/lib/seo'
import Breadcrumbs from '@/components/seo/Breadcrumbs'
/* `load()` feeds the metadata and the JSON-LD; `loadBankProfile` shapes the
   same rows for the page. Both read the same PostgREST URLs, which Next
   dedupes within one render, so nothing is fetched twice. */
import { BankProfilePage } from '@/components/site/BankProfilePage'
import { loadBankProfile } from '@/lib/banksServer'
import { bankTitle, bankDescription, bankJsonLd, type BankSeoInput } from '@/lib/bankSeo'
import { messages } from '@/lib/i18n'
import {
  getBank, listBanks, listProducts, listServices, productDetail, bankFinancials,
  coverageOf, indexability,
} from '@/lib/banks'
import { editorialFor, canonicalSlug } from '@/lib/bankEditorial'
import { permanentRedirect } from 'next/navigation'

export const revalidate = 3600
export const dynamicParams = true

/**
 * Every reconciled bank has a prepared page; only some are indexable. The
 * decision is `indexability()` and it reads the same data the page renders, so
 * a profile cannot be withheld from the sitemap while telling Google it is
 * indexable, or the reverse.
 */
export async function generateStaticParams() {
  return (await listBanks()).map((b) => ({ slug: b.slug }))
}

async function load(slug: string) {
  const bank = await getBank(slug)
  if (!bank) return null
  const [products, services] = await Promise.all([listProducts(slug), listServices(slug)])
  const { facts, conditions } = await productDetail(products.map((p) => p.id))
  const fin = bank.ticker ? (await bankFinancials([bank.ticker])).get(bank.ticker) ?? null : null
  const editorial = editorialFor(bank.slug)
  const input: BankSeoInput = {
    bank, products, facts, services, editorial,
    indexable: indexability(bank, products, services, Boolean(fin), editorial).indexable,
  }
  return { input, conditions, fin, editorial }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const loaded = await load(slug)
  if (!loaded) return {}
  const { input } = loaded
  return {
    alternates: seoAlternates(`/banks/${slug}`),
    openGraph: { url: absUrl(`/banks/${slug}`), images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
    title: bankTitle(input, 'ar'),
    description: bankDescription(input, 'ar'),
    /* A prepared profile with nothing verified on it stays out of the index
       until it has something to say. It is still reachable, still linked from
       the hub, and still renders its status. */
    ...(input.indexable ? {} : { robots: { index: false, follow: true } }),
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  /* The package's research slugs — ashur-international-bank, cihan-islamic-
     bank, al-mansour-bank-for-investment, trade-bank-of-iraq — are aliases of
     live banks, and resolve to them rather than duplicating the page. */
  const canonical = canonicalSlug(slug)
  if (canonical !== slug) permanentRedirect(`/banks/${canonical}`)
  const loaded = await load(slug)
  if (!loaded) notFound()
  const profile = await loadBankProfile(slug)
  if (!profile) notFound()
  const { input } = loaded
  const { bank } = input
  const ld = bankJsonLd(input, 'ar')
  const t = messages('ar').banks
  return (
    <>
      <Breadcrumbs
        trail={[
          { name: t.breadcrumb, path: '/banks' },
          { name: bank.name_ar, path: `/banks/${slug}` },
        ]}
        locale="ar"
      />
      {/* Structured data only where the page is indexable: markup on a noindex
          page is a request to be treated as a result. */}
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} /> : null}
      <BankProfilePage initial={profile} />
    </>
  )
}
