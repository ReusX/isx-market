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

import { isCurrentEnough } from '@/lib/banks'
import type { Bank, ProductRow, FactRow, ServiceRow } from '@/lib/banks'
import type { EditorialProfile } from '@/lib/bankEditorial'
import { absUrl } from '@/lib/seo'
import { messages } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/locale'

export interface BankSeoInput {
  bank: Bank
  products: ProductRow[]
  facts: FactRow[]
  services: ServiceRow[]
  indexable: boolean
  /** The editorial package, whose Arabic title and description are written
   *  per bank and used verbatim. English keeps the generated sentence. */
  editorial?: EditorialProfile | null
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
export function bankTitle({ bank, products, editorial }: BankSeoInput, locale: Locale): string {
  const t = messages(locale).banks
  /* The package wrote a distinct Arabic title for every bank — a sentence
     about the bank, not a template — and carries no rate in any of them. */
  if (locale === 'ar' && editorial?.seo.title) return editorial.seo.title
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
export function bankDescription({ bank, products, services, editorial }: BankSeoInput, locale: Locale): string {
  const t = messages(locale).banks
  if (locale === 'ar' && editorial?.seo.description) return editorial.seo.description
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
/* Bases under which a percentage may be called an interest rate in markup.
   Expected profit is not interest; "from" is a floor, not a rate; an unstated
   basis is not a number Google should compare across banks. */
const INTEREST_BASES = new Set(['annual', 'annual_declining', 'flat'])

export function bankJsonLd({ bank, products, facts, indexable, editorial }: BankSeoInput, locale: Locale): object | null {
  if (!indexable) return null
  const name = locale === 'ar' ? bank.name_ar : bank.name_en
  const url = absUrl(`/banks/${bank.slug}`, locale)
  const city = cityOf(bank, locale)

  /* When the package selected products, those and only those are on the
     page, so those and only those may be described. No AggregateRating is
     emitted anywhere: the editorial scores are desk-research judgments, not
     votes, and would be a lie in that vocabulary. */
  const selected = editorial ? new Set(editorial.products.map((x) => x.slug)) : null
  const editorialRate = (slug: string) => editorial?.products.find((x) => x.slug === slug)?.rate ?? null

  const offers = products
    .filter((p) => !selected || selected.has(p.slug))
    .map((p) => {
      const er = editorialRate(p.slug)
      /* Only a rate the page actually headlines. A figure demoted for age is
         not offered to Google as an interest rate either. */
      const rate = facts.find((f) =>
        f.product_id === p.id && f.field_key === 'rate' && f.state === 'KNOWN' && isCurrentEnough(f))
      const value = er ? er.value : rate?.value_num
      const asInterest = er ? INTEREST_BASES.has(er.basis) : Boolean(rate?.value_num)
      if (value == null) return null
      return {
        '@type': 'FinancialProduct',
        name: locale === 'ar' ? p.name_ar : p.name_en,
        category: p.kind.startsWith('deposit') ? 'Deposit' : 'Loan',
        ...(asInterest && value > 0 ? { interestRate: { '@type': 'QuantitativeValue', value, unitText: 'PERCENT' } } : {}),
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
