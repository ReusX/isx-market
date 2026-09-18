import type { CurrenciesData, CurrencyCode } from '@/lib/currencies'
import type { FxData } from '@/lib/rates'
import { CBI_OFFICIAL_RATE } from '@/lib/fxOfficial'
import { localeDate } from '@/lib/date'
import { messages } from '@/lib/i18n'

/** Client-safe arithmetic shared by the page, its metadata and its FAQ. */
export const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
export const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const nf4 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })

/** A cross rate: 4 decimals for euros, whole numbers for rials. */
export const fmtX = (v: number) => (v >= 100 ? nf0.format(v) : nf4.format(v))

export const fmtIqd = (v: number | null) => (v == null ? '—' : v >= 100 ? nf0.format(v) : nf2.format(v))

export function currencyFigures(code: CurrencyCode, cur: CurrenciesData | null, fx: FxData | null) {
  const market = fx?.sell ?? fx?.buy ?? null
  const perUsd = cur?.perUsd[code] ?? null
  const iqd = perUsd && market ? market / perUsd : null
  const iqdOfficial = perUsd ? CBI_OFFICIAL_RATE / perUsd : null
  return { market, perUsd, iqd, iqdOfficial, date: cur?.updatedAt?.slice(0, 10) ?? null }
}

/** The live figures the FAQ sentences need — also used by the route's metadata. */
export function faqVars(code: CurrencyCode, name: string, short: string, cur: CurrenciesData | null, fx: FxData | null, toman: boolean, pegged: boolean, locale: 'ar' | 'en') {
  const P = messages(locale).rates.page.currency
  const f = currencyFigures(code, cur, fx)
  /* Rial pages work in 100,000 toman (= 1,000,000 rial), the street's unit. */
  const unit = toman ? 1_000_000 : 1
  return {
    name, short,
    iqd: fmtIqd(f.iqd != null ? f.iqd * unit : null),
    iqdOfficial: fmtIqd(f.iqdOfficial != null ? f.iqdOfficial * unit : null),
    perUsd: f.perUsd ? (toman ? `${fmtX(f.perUsd / 10)} ${P.tomanUnit}` : fmtX(f.perUsd)) : '—',
    hundred: fmtIqd(f.iqd != null ? (toman ? f.iqd * unit : f.iqd * 100) : null),
    usd: f.market ? nf0.format(f.market) : '—',
    date: f.date ? localeDate(f.date, locale) : '—',
    pegged,
    toman: toman && f.iqd != null ? P.tomanAnswer(fmtIqd(f.iqd * 1_000_000), fmtIqd(f.iqd * 10_000_000)) : null,
  }
}
