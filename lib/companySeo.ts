// Real-world search spellings per ticker, sourced from Search Console.
//
// The company data file holds FORMAL names (e.g. "اسيا سيل للاتصالات"), but
// people search colloquial forms · most queries for Asiacell are the one-word
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
  // Asiacell · searched "اسياسيل" (one word), data has "اسيا سيل".
  TASC: { ar: 'اسياسيل', alts: ['اسيا سيل', 'asiacell'] },
  // Baghdad Soft Drinks · searched as the brand "بيبسي بغداد" / "بيبسيكو".
  IBSD: { ar: 'بيبسي بغداد', alts: ['بيبسيكو', 'بيبسي', 'بغداد للمشروبات الغازية', 'baghdad soft drinks'] },
  // Al-Khatem Telecommunication · the listed entity of Zain Iraq.
  TZNI: { alts: ['زين العراق', 'زين', 'الخاتم للاتصالات', 'zain iraq'] },
  // Bank of Baghdad · formal name already matches "مصرف بغداد".
  BBOB: { alts: ['بنك بغداد', 'bank of baghdad'] },
  // Dar Es Salaam Investment Bank.
  BDSI: { alts: ['مصرف دار السلام', 'بنك دار السلام', 'dar es salaam bank'] },
}

export interface SeoFields {
  shortAr:     string
  title:       string
  description: string
  keywords:    string[]
  h1:          string
  /** For JSON-LD alternateName · helps Google link aliases to this entity. */
  altNames:    string[]
}

export function buildCompanySeo(sym: string, arName: string, enName: string): SeoFields {
  const seo       = COMPANY_SEO[sym] ?? {}
  const shortAr   = seo.ar ?? arName
  const alts      = (seo.alts ?? []).filter(a => a && a !== shortAr)

  const title = `سعر سهم ${shortAr} اليوم · ${sym} في بورصة العراق`

  /*
   * One natural Arabic answer to the query, ~150 characters, and nothing else.
   *
   * The previous version repeated the company name three times, carried an
   * English translation of itself, and hardcoded "٢٠٢٦" — Google rejected it on
   * every company page and substituted a scraped ratios table instead
   * ("العائد على حقوق الملكية · 36.8% ; العائد على الأصول · 26.8%"). Aliases
   * moved to `keywords`/`altNames`, where they belong, so the sentence stays
   * readable enough to actually get used.
   */
  const description =
    `كم سعر سهم ${shortAr} اليوم؟ تابع سعر السهم (${sym}) في بورصة العراق ` +
    `مع نسبة التغيّر، حجم التداول، وأعلى وأدنى سعر خلال 52 أسبوعاً.`

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

  // Kept bilingual — this one is a heading, not a snippet, so it carries the
  // English name for English queries without competing for title characters.
  // Aliases stay out of it; a heading stuffed with spellings invites Google to
  // rewrite the title it derives from the page.
  const h1 = `سعر سهم ${shortAr} اليوم · ${sym} في بورصة العراق — ${enName} Share Price`

  const altNames = Array.from(new Set([arName, shortAr, ...alts].filter(a => a && a !== enName)))

  return { shortAr, title, description, keywords, h1, altNames }
}
