/**
 * The company profile — the unique prose, facts and questions each
 * /c/[sym] page carries under its numbers.
 *
 * Forty-one companies have hand-written copy in `lib/companyProfiles`; the
 * rest get a generated profile from their typed fields and the dictionary's
 * templates (`company.gen`), so every company page has a paragraph that is
 * about THAT company. The last close is folded into the facts and into the
 * price question, so the answer to «كم سعر سهم … اليوم» is a number and a
 * session, not a promise.
 *
 * Pure, and it carries no copy of its own: the templates come in as `g`.
 */
import { COMPANY_PROFILES, type Profile } from '@/lib/companyProfiles'
import type { company as ArCompany } from '@/lib/i18n/messages/ar/company'
import { localeDate } from '@/lib/date'

type Gen = typeof ArCompany.gen

export interface ProfileInput {
  sym: string
  ar: string
  en: string
  /** Sector name in the reader's language, already resolved. */
  sector: string
  /** Market cap in IQD, if known. */
  mcapIqd: number | null
  quote: { close: number; pct: number | null; date: string; suspended: boolean } | null
}

function fmtMcap(v: number | null): string | null {
  if (!v) return null
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  return `${(v / 1e6).toLocaleString('en', { maximumFractionDigits: 0 })}M`
}

/** «16.06 دينار عراقي، بارتفاع 1.89%» · direction as a word, never a sign. */
function priceText(q: NonNullable<ProfileInput['quote']>, g: Gen, locale: 'ar' | 'en'): string {
  const price = g.price(q.close.toLocaleString('en-US', { maximumFractionDigits: 2 }))
  if (q.pct == null || Math.abs(q.pct) < 0.005) return price
  return `${price}${locale === 'ar' ? '، ' : ', '}${q.pct > 0 ? g.up : g.down} ${Math.abs(q.pct).toFixed(2)}%`
}

export function buildCompanyProfile(p: ProfileInput, g: Gen, locale: 'ar' | 'en'): Profile & { heading: string } {
  const isAr = locale === 'ar'
  /* Companies with no Arabic name on file fall back to the English one rather
     than leave a hole where the name belongs. */
  const name = (isAr ? p.ar?.trim() || p.en : p.en?.trim() || p.ar) || p.sym
  const curated = COMPANY_PROFILES[p.sym]?.[isAr ? 'ar' : 'en']
  const mcap = fmtMcap(p.mcapIqd)
  const base: Profile = curated ?? {
    about: g.about({ name, sym: p.sym, sector: p.sector, mcap }),
    facts: [
      { label: g.facts.ticker, value: p.sym },
      { label: g.facts.sector, value: p.sector },
      ...(mcap ? [{ label: g.facts.mcap, value: `${mcap} IQD` }] : []),
      { label: g.facts.exchange, value: g.facts.exchangeValue },
      { label: g.facts.currency, value: g.facts.currencyValue },
    ],
    faq: g.faq({ name, sym: p.sym, sector: p.sector }),
  }
  /* Suspended listings are skipped: their last close is years old, and this
     copy is framed as "today". */
  const q = p.quote && !p.quote.suspended ? p.quote : null
  const out: Profile = q
    ? {
        ...base,
        facts: [{ label: g.facts.lastPrice, value: priceText(q, g, locale) }, ...base.facts],
        faq: [
          { q: g.priceQ(name), a: g.priceA(name, p.sym, priceText(q, g, locale), localeDate(q.date, locale)) },
          ...base.faq.filter((qa) => !g.isPriceQ(qa.q)),
        ],
      }
    : base
  return { ...out, heading: g.heading(name, p.sym) }
}
