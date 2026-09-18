/** The currency list and the data shape — shared by the server fetcher and
 *  the client page, so it must import nothing server-side. */
export const CURRENCY_CODES = [
  'EUR', 'GBP', 'TRY', 'AED', 'SAR', 'KWD', 'JOD', 'QAR', 'BHD', 'OMR', 'EGP', 'IRR', 'SYP', 'LBP',
  'CNY', 'JPY', 'INR', 'PKR', 'RUB', 'CHF', 'CAD', 'AUD', 'SEK', 'NOK', 'MYR', 'KRW',
] as const
export type CurrencyCode = (typeof CURRENCY_CODES)[number]
export interface CurrenciesData {
  /** Units of each currency per ONE US dollar. */
  perUsd: Partial<Record<CurrencyCode, number>>
  /** The feed's own dinar-per-dollar figure — close to the official rate. */
  iqdPerUsdFeed: number | null
  updatedAt: string   // the feed's timestamp, ISO
  fetchedAt: string
  source: string
  sourceUrl: string
}

/** Flag emoji per currency — the issuing country; the euro gets the EU flag. */
export const CURRENCY_FLAGS: Record<CurrencyCode, string> = {
  EUR: '🇪🇺', GBP: '🇬🇧', TRY: '🇹🇷', AED: '🇦🇪', SAR: '🇸🇦', KWD: '🇰🇼', JOD: '🇯🇴', QAR: '🇶🇦', BHD: '🇧🇭', OMR: '🇴🇲', EGP: '🇪🇬', IRR: '🇮🇷', SYP: '🇸🇾', LBP: '🇱🇧',
  CNY: '🇨🇳', JPY: '🇯🇵', INR: '🇮🇳', PKR: '🇵🇰', RUB: '🇷🇺', CHF: '🇨🇭', CAD: '🇨🇦', AUD: '🇦🇺', SEK: '🇸🇪', NOK: '🇳🇴', MYR: '🇲🇾', KRW: '🇰🇷',
}
