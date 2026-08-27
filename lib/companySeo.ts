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
  /*
   * Al-Khatem Telecommunication is the listed entity of ZAIN IRAQ · confirmed
   * by the site owner 2026-08-04. public/llms.txt used to call it Korek, which
   * is a different operator entirely; that has been corrected and Korek is
   * deliberately NOT an alias here — it would tie this page to the wrong company.
   *
   * Titled by the brand rather than the legal name because that is what people
   * search; "الخاتم" stays in the aliases.
   */
  TZNI: { ar: 'زين العراق', alts: ['زين', 'الخاتم للاتصالات', 'الخاتم', 'zain iraq'] },
  // Bank of Baghdad · formal name already matches "مصرف بغداد".
  BBOB: { alts: ['بنك بغداد', 'bank of baghdad'] },
  // Dar Es Salaam Investment Bank.
  BDSI: { alts: ['مصرف دار السلام', 'بنك دار السلام', 'dar es salaam bank'] },

  /*
   * The seven names `shortenArabicName` deliberately refuses to cut, because
   * the automatic core would be a generic descriptor ("الشركة العراقية") or one
   * that several listed companies share ("الوطنية"). Left alone they produce
   * titles of 71-104 characters, which Google truncates.
   *
   * Each of these keeps the distinguishing part of the company's own legal
   * name and drops trailing activity clauses — an abbreviation, not a
   * different company. The full legal name stays in `keywords`/`altNames`.
   */
  HNTI: { ar: 'الوطنية للأستثمارات السياحية' },
  AIPM: { ar: 'العراقية لانتاج وتسويق اللحوم' },
  IICM: { ar: 'العراقية لصناعة الكارتون' },
  IMIB: { ar: 'الوطنية للصناعات المعدنية' },
  IRMC: { ar: 'الالبسة الجاهزة' },
  AIRP: { ar: 'العراقية للمنتجات الزراعية' },
  AMEF: { ar: 'الشرق الاوسط للأسماك' },
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


/**
 * The ENGLISH company SEO fields.
 *
 * ── What it will not do ───────────────────────────────────────────────────
 * It never invents an English company name. `companies.json` carries an `en`
 * for most listings; where it is missing or is just the ticker echoed back,
 * the title falls to the TICKER alone and the description carries the official
 * Arabic name once, so the page still matches a search for it. A machine
 * translation of a legal corporate name presented as the company's English
 * name is the exact failure the brief names.
 *
 * ── Why it is not a translation of the Arabic ─────────────────────────────
 * The Arabic title is built around «سعر سهم … اليوم», which is how the query is
 * typed in Arabic. The English equivalent of that query is "<name> share price"
 * plus the exchange, and «today» is dropped entirely: the product publishes the
 * last session's close, so an English title promising today's price would be
 * making a claim the page then contradicts. The Arabic keeps its «اليوم»
 * because that is a search phrase already indexed, and its description states
 * the session — a compromise recorded there, not silently mirrored here.
 */
export function buildCompanySeoEn(
  sym: string,
  arName: string,
  enName: string,
  /** Price sentence from `describeQuote`. Omitted for suspended listings. */
  priceLine?: string,
): SeoFields {
  const seo = COMPANY_SEO[sym] ?? {}
  const hasEnglishName = Boolean(enName?.trim()) && enName.trim().toUpperCase() !== sym
  const name = hasEnglishName ? enName.trim() : sym

  const title = hasEnglishName
    ? `${name} (${sym}) share price · Iraq Stock Exchange`
    : `${sym} share price · Iraq Stock Exchange`

  const subject = hasEnglishName ? `${name} (${sym})` : `${sym}${arName ? ` · ${arName}` : ''}`

  const description = priceLine
    ? `${subject} last traded at ${priceLine} on the Iraq Stock Exchange. Track the daily change, trading volume and the 52-week high and low.`
    : `Track ${subject} on the Iraq Stock Exchange: last price, daily change, trading volume and the 52-week range, updated after each session.`

  const alts = (seo.alts ?? []).filter(Boolean)
  const keywords = Array.from(new Set([
    enName, sym, arName, ...alts,
    `${name} share price`,
    `${sym} share price`,
    `${sym} stock`,
    'iraq stock exchange', 'ISX', 'iraqi stocks', 'iraq share prices',
  ].filter(Boolean)))

  const h1 = hasEnglishName
    ? `${name} (${sym}) share price · Iraq Stock Exchange`
    : `${sym} share price · Iraq Stock Exchange`

  const altNames = Array.from(new Set([arName, ...alts].filter((a) => a && a !== name)))

  return { shortAr: name, title, description, keywords, h1, altNames }
}
