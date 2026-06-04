// Real-world search spellings per ticker, sourced from Search Console.
//
// The company data file holds FORMAL names (e.g. "اسيا سيل للاتصالات"), but
// people search colloquial forms — most queries for Asiacell are the one-word
// "اسياسيل", not the spaced "اسيا سيل". This map lets the title, description,
// keywords, H1, and structured data cover the spellings users actually type.
// Extend it as Search Console surfaces more queries.

export interface CompanySeo {
  /** Short colloquial Arabic name to lead the title with (e.g. اسياسيل). */
  ar?: string
  /** Additional spellings/aliases (Arabic + English) for keywords + schema. */
  alts?: string[]
}

export const COMPANY_SEO: Record<string, CompanySeo> = {
  TASC: { ar: 'اسياسيل', alts: ['اسيا سيل', 'asiacell'] },
}

export interface SeoFields {
  shortAr:     string
  title:       string
  description: string
  keywords:    string[]
  h1:          string
  /** For JSON-LD alternateName — helps Google link aliases to this entity. */
  altNames:    string[]
}

export function buildCompanySeo(sym: string, arName: string, enName: string): SeoFields {
  const seo       = COMPANY_SEO[sym] ?? {}
  const shortAr   = seo.ar ?? arName
  const alts      = (seo.alts ?? []).filter(a => a && a !== shortAr)
  const altInline = alts.length ? ` (${alts.join('، ')})` : ''

  const title = `سعر سهم ${shortAr} اليوم (${sym}) | بورصة العراق`

  const description =
    `كم سعر سهم ${shortAr} اليوم؟ سعر سهم ${shortAr}${altInline} ورمزه ${sym} ` +
    `مباشر في بورصة العراق ٢٠٢٦ مع الرسم البياني، الأعلى والأدنى، وحجم التداول. ` +
    `${enName} (${sym}) live share price on the Iraq Stock Exchange (ISX).`

  const keywords = Array.from(new Set([
    shortAr, arName, enName, sym, ...alts,
    `سعر سهم ${shortAr}`,
    `سعر سهم ${shortAr} اليوم`,
    `كم سعر سهم ${shortAr}`,
    `سعر سهم ${shortAr} اليوم العراق ٢٠٢٦`,
    `سهم ${shortAr}`,
    `${enName} stock price`,
    `${sym} stock price`,
    'بورصة العراق', 'سوق الاسهم العراقي', 'اسعار الاسهم العراقية',
    'iraq stock exchange', 'isx',
  ].filter(Boolean)))

  const h1 =
    `سعر سهم ${shortAr}${altInline} اليوم — ${sym} في بورصة العراق | ` +
    `${enName} (${sym}) Iraq Stock Exchange Share Price`

  const altNames = Array.from(new Set([arName, shortAr, ...alts].filter(a => a && a !== enName)))

  return { shortAr, title, description, keywords, h1, altNames }
}
