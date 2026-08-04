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
  // Al-Khatem Telecommunication · the listed entity of Zain Iraq. Nobody
  // searches "الخاتم" (which is what the shortener would otherwise produce);
  // they search the brand. The legal name stays in the aliases.
  TZNI: { ar: 'زين العراق', alts: ['زين', 'الخاتم للاتصالات', 'الخاتم', 'zain iraq'] },
  // Bank of Baghdad · formal name already matches "مصرف بغداد".
  BBOB: { alts: ['بنك بغداد', 'bank of baghdad'] },
  // Dar Es Salaam Investment Bank.
  BDSI: { alts: ['مصرف دار السلام', 'بنك دار السلام', 'dar es salaam bank'] },
}

/*
 * companies.json holds full legal names, and 40 of the 104 produced titles past
 * the ~65 characters Google displays — one ran to 119. Iraqi listed names follow
 * "<core> ل<activity> و<activity>…", so cutting at the activity clause leaves a
 * usable short name: "طريق الخازر لانتاج وتجارة المواد الانشائية والاستثمارات
 * العقارية والمقاولات العامة" → "طريق الخازر".
 *
 * A heuristic over Arabic morphology, so it is guarded rather than trusted:
 *   · a core that is merely a generic descriptor is rejected — "الشركة العراقية
 *     لانتاج وتسويق اللحوم" must not become "الشركة العراقية";
 *   · a core shared by two listed companies is rejected as ambiguous. This is
 *     what protects the single-word cores: three companies begin "الوطنية"، so
 *     none of them may shorten to it, while "الفلوجة" and "الكندي" are unique
 *     and make perfectly good names on their own.
 * Anything rejected keeps its full name and simply gets truncated by Google.
 *
 * A curated `COMPANY_SEO[sym].ar` always wins over this.
 */
const GENERIC_CORES = new Set([
  'الشركة العراقية', 'الشرق الاوسط', 'بين النهرين', 'الشركة العراقية العامة',
  'العراقية العامة', 'الشركة الوطنية', 'الوطنية',
])

export function shortenArabicName(full: string, allNames: string[] = []): string {
  const clean = full.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
  const words = clean.split(' ')
  // The activity clause opens with a li- prefixed word (لانتاج / للصناعات / …).
  const cut = words.findIndex((w, i) => i > 0 && /^(ل|لل|للأ|للا)/.test(w))
  if (cut < 1) return clean

  const core = words.slice(0, cut).join(' ')
  if (GENERIC_CORES.has(core)) return clean

  // Ambiguous if another listed company shortens to the same core.
  const clash = allNames.some(other => {
    if (other === full) return false
    const o = other.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
    return o === core || o.startsWith(core + ' ')
  })
  return clash ? clean : core
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

export function buildCompanySeo(
  sym: string,
  arName: string,
  enName: string,
  /**
   * Live price sentence from `describeQuote`, e.g. "16.06 دينار، بارتفاع 1.89%".
   * When present it leads the description, because a snippet carrying the
   * actual number is the thing that earns the click on a "كم سعر سهم" query.
   * Omitted for suspended listings — see lib/listing.ts.
   */
  priceLine?: string,
  /** Every listed Arabic name · lets the shortener reject an ambiguous core. */
  allArabicNames?: string[],
): SeoFields {
  const seo       = COMPANY_SEO[sym] ?? {}

  /*
   * 20 of the 104 companies carry an empty `ar` in companies.json (BQUR, BBAY,
   * ITLI, ABAP …), which produced titles reading "سعر سهم  اليوم · BQUR" — a
   * double space where the name should be — on every one of those pages.
   *
   * Those fall back to the TICKER, not to the English name. Dropping a long
   * English company name into the middle of an Arabic title is the exact
   * bilingual mash bidi reorders, and it is what the whole title rewrite set
   * out to remove; "سعر سهم BQUR اليوم" stays in one script and short. The
   * English name still appears in the description and the page body, where
   * there is room for it and it helps English-name queries match.
   *
   * The real fix is filling in the missing Arabic names — this only keeps the
   * gap from being user-visible.
   */
  const hasArabicName = Boolean(arName?.trim())
  const shortAr   = seo.ar
    ?? (hasArabicName ? shortenArabicName(arName, allArabicNames) : sym)
  const alts      = (seo.alts ?? []).filter(a => a && a !== shortAr)

  // When the name IS the ticker there is no point printing it twice.
  const title = hasArabicName
    ? `سعر سهم ${shortAr} اليوم · ${sym} في بورصة العراق`
    : `سعر سهم ${sym} اليوم في بورصة العراق`

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
  // Where the title had to fall back to the ticker, the description carries the
  // English name once so the page still matches searches for it.
  const subject = hasArabicName ? `${shortAr} (${sym})` : `${sym} · ${enName}`

  // A spelled-out English name eats ~40 characters of the ~160 the snippet gets,
  // so those pages take the short tail and keep the whole line inside budget.
  const tail = hasArabicName
    ? 'تابع التغيّر اليومي، حجم التداول، وأعلى وأدنى سعر خلال 52 أسبوعاً.'
    : 'تابع التغيّر وحجم التداول والرسم البياني.'

  const description = priceLine
    ? `سعر سهم ${subject} اليوم ${priceLine} في بورصة العراق. ${tail}`
    : `كم سعر سهم ${subject} اليوم؟ تابع سعر السهم في بورصة العراق مع نسبة التغيّر وحجم التداول.`

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
