/**
 * Titles, descriptions and structured data for bank profiles.
 *
 * One generator for 79 pages, because the alternative is 79 hand-written
 * descriptions and 79 chances to claim something the page does not show. The
 * SENTENCES live in the message dictionaries — Arabic copy does not belong in
 * shared source, and the i18n gate enforces that — so this file decides WHICH
 * sentence a bank gets and from which fields, and the dictionary decides how
 * it reads.
 *
 * Three rules the generator enforces:
 *
 *   · No rate in a title or a description. A rate in a snippet is a promise to
 *     keep it current, and nothing reverifies 79 banks on Google's crawl
 *     schedule. What is promised instead is what the page holds: how many
 *     products carry published terms, or the bank's status.
 *   · No superlatives and no invented specificity. "أفضل مصرف" is not a claim
 *     this data supports, and a description identical across 79 banks is
 *     keyword filler.
 *   · Structured data describes only what a reader can see. A FinancialProduct
 *     node is emitted for a product whose rate is actually rendered, and for
 *     no other; a withheld page emits none at all.
 */

import type { Bank, ProductRow, FactRow, ServiceRow } from '@/lib/banks'
import { absUrl } from '@/lib/seo'
import { messages } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/locale'

export interface BankSeoInput {
  bank: Bank
  products: ProductRow[]
  facts: FactRow[]
  services: ServiceRow[]
  indexable: boolean
}

/* hq_city is stored in Arabic — the bank's own spelling of its city — so the
   English surfaces translate it through the page's own map, and the
   description and the visible page say the same word. */
export function cityOf(bank: Bank, locale: Locale): string | null {
  if (!bank.hq_city) return null
  const t = messages(locale).banks
  return t.city[bank.hq_city] ?? bank.hq_city
}

/** «مصرف بغداد · الودائع والقروض وشروطها» — the name, then what is on the page. */
export function bankTitle({ bank, products }: BankSeoInput, locale: Locale): string {
  const t = messages(locale).banks
  const name = locale === 'ar' ? bank.name_ar : bank.name_en
  const deposits = products.some((p) => p.kind.startsWith('deposit') && p.known_facts > 0)
  const loans = products.some((p) => !p.kind.startsWith('deposit') && p.known_facts > 0)

  if (bank.operating_status === 'liquidation') return t.seo.titleLiquidation(name)
  if (bank.operating_status === 'guardianship') return t.seo.titleGuardianship(name)
  if (deposits && loans) return t.seo.titleBoth(name)
  if (deposits) return t.seo.titleDeposits(name)
  if (loans) return t.seo.titleLoans(name)
  return t.seo.titleProfile(name)
}

/**
 * The description names what the page can be held to: the classification, the
 * listing, and how many products carry published terms.
 */
export function bankDescription({ bank, products, services }: BankSeoInput, locale: Locale): string {
  const t = messages(locale).banks
  const name = locale === 'ar' ? bank.name_ar : bank.name_en
  const withTerms = products.filter((p) => p.known_facts > 0).length
  const verified = services.filter((s) => s.availability === 'available').length

  const bits = [t.seo.descKind(t.typeAdj[bank.bank_type], t.ownershipAdj[bank.ownership])]
  const city = cityOf(bank, locale)
  if (city) bits.push(t.seo.descCity(city))
  if (bank.ticker) bits.push(t.seo.descListed(bank.ticker))
  const head = t.seo.descHead(name, bits.join(t.seo.join))

  if (bank.operating_status === 'liquidation') return t.seo.descLiquidation(head)
  if (bank.operating_status === 'guardianship') return t.seo.descGuardianship(head)
  if (withTerms) {
    return t.seo.descTerms(
      head,
      t.seo.descProducts(String(withTerms)),
      verified ? t.seo.descServices(String(verified)) : '',
    )
  }
  return t.seo.descNoTerms(head)
}

/**
 * JSON-LD for the profile.
 *
 * `BankOrCreditUnion` for the institution, and a `FinancialProduct` for each
 * product whose rate is VISIBLE on the page. A product shown without a rate
 * gets no `interestRate` — an absent property is honest, an invented zero is
 * not — and a page withheld from the index emits nothing, because structured
 * data on a noindex page is a request to be treated as a result.
 */
export function bankJsonLd({ bank, products, facts, indexable }: BankSeoInput, locale: Locale): object | null {
  if (!indexable) return null
  const name = locale === 'ar' ? bank.name_ar : bank.name_en
  const url = absUrl(`/banks/${bank.slug}`, locale)
  const city = cityOf(bank, locale)

  const offers = products
    .map((p) => {
      const rate = facts.find((f) => f.product_id === p.id && f.field_key === 'rate' && f.state === 'KNOWN')
      if (!rate?.value_num) return null
      return {
        '@type': 'FinancialProduct',
        name: locale === 'ar' ? p.name_ar : p.name_en,
        category: p.kind.startsWith('deposit') ? 'Deposit' : 'Loan',
        interestRate: { '@type': 'QuantitativeValue', value: rate.value_num, unitText: 'PERCENT' },
        ...(p.currency ? { currenciesAccepted: p.currency } : {}),
      }
    })
    .filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'BankOrCreditUnion',
    '@id': url,
    name,
    url,
    ...(bank.website ? { sameAs: bank.website } : {}),
    ...(city ? { address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: 'IQ' } } : {}),
    ...(bank.founded ? { foundingDate: String(bank.founded) } : {}),
    ...(offers.length ? { hasOfferCatalog: { '@type': 'OfferCatalog', name, itemListElement: offers } } : {}),
  }
}
