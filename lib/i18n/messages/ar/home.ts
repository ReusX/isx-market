/**
 * The homepage.
 *
 * ── What the page answers, in order ───────────────────────────────────────
 * What happened in the market · how broad was the move · where did activity
 * concentrate · what did foreign investors do · which companies matter now ·
 * where can I go deeper. Every heading below is named for the question it
 * answers, not for the module that renders it.
 *
 * ── The greeting stays, the fallback does not ─────────────────────────────
 * A signed-in reader is greeted by name — that is the approved composition and
 * it is kept. What is replaced is the signed-out fallback, «نظرة على السوق»,
 * which said nothing: the page now leads with «السوق في آخر جلسة», which is
 * both what the reader is looking at and the honest frame for it. It is a
 * SESSION, not a day, and the heading says so — the site never claims «اليوم».
 *
 * ⚠ `valueCapMode` and `valueTradeMode` are two labels for one column because
 * it is genuinely two metrics. A bare «القيمة» there was a shipped bug: the
 * market-cap tab showed traded value under a header that could mean either.
 */
export const home = {
  eyebrow:      'نظرة السوق',
  title:        'السوق في آخر جلسة',
  greeting:     (salutation: string, name: string) => `${salutation}، ${name}`,
  morning:      'صباح الخير',
  evening:      'مساء الخير',
  summaryLabel: 'ملخص السوق العراقي',

  index: {
    eyebrow:  'مؤشر السوق العراقي',
    periods:  'الفترة الزمنية',
    low:      'أدنى الفترة',
    high:     'أعلى الفترة',
    session:  (d: string) => `آخر جلسة ${d}`,
    expanded: 'مخطط موسّع',
    fullChart:'المخطط الكامل',
    rangeAll: 'الكل',
    expandedLabel: 'مخطط ISX60 الموسّع',
    plotLabel: (range: string) => `رسم مؤشر ISX60 · ${range} · استخدم الأسهم لقراءة النقاط`,
  },

  flow: {
    title:     'تدفقات المستثمر الأجنبي',
    sub:       'السيولة الدولية',
    none:      'لا تتوفر بيانات تدفق أجنبي لهذه الجلسة.',
    balanced:  'تدفق أجنبي متوازن',
    netBuy:    'صافي شراء أجنبي',
    netSell:   'صافي بيع أجنبي',
    staleNote: 'بيانات التدفق أقدم من جلسة المؤشر.',
    buyLine:   (share: string) => `من التداول الأجنبي شراء · ${share}`,
    close:     'التداول الأجنبي متقارب بين الشراء والبيع',
    sessionOf: (d: string) => `جلسة ${d}`,
    more:      'عرض التدفقات',
    details:   'التفاصيل',
    barLabel:  (buy: string, sell: string) => `شراء أجنبي ${buy} دينار، بيع أجنبي ${sell} دينار`,
    buySeg:    (v: string, share: string) => `شراء أجنبي ${v} دينار، ${share} بالمئة`,
    sellSeg:   (v: string, share: string) => `بيع أجنبي ${v} دينار، ${share} بالمئة`,
    splitLabel:(buy: string, sell: string) => `${buy} بالمئة شراء و${sell} بالمئة بيع`,
    readBuy:   'شراء أجنبي',
    readSell:  'بيع أجنبي',
    ofForeign: 'من التداول الأجنبي',
    shareLine: (pct: string, buying: boolean) =>
      `${pct} من التداول الأجنبي ${buying ? 'شراء' : 'بيع'}`,
  },

  breadth: {
    title:   'أداء السوق',
    details: 'عرض تفاصيل السوق',
    up:      'رابح',
    flat:    'ثابت',
    down:    'خاسر',
    na:      'دون إغلاق سابق',
    positive:'إيجابي',
    ofListed:(n: string) => `من ${n} مدرجة`,
    traded:  (n: string) => `${n} شركة متداولة`,
    reading: (up: string, flat: string, down: string, na: string, traded: string) =>
      `${up} رابح، ${flat} ثابت، ${down} خاسر، ${na} دون إغلاق سابق، من ${traded} شركة متداولة`,
  },

  activity: {
    eyebrow: 'جلسة السوق',
    title:   'نشاط السوق',
    value:   'قيمة التداول',
    volume:  'حجم التداول',
    trades:  'عدد الصفقات',
    unitShares: 'سهم',
    unitTrades: 'صفقة',
    unitIqd:    'IQD',
    trendOf:    (what: string) => `اتجاه ${what}`,
    more:    'عرض الإحصاءات',
  },

  sectors: {
    eyebrow: 'أداء القطاعات',
    title:   'حركة السوق حسب القطاع',
    map:     'الخريطة الكاملة',
    reading: (name: string, dir: string, pct: string) => `${name}، ${dir} ${pct} بالمئة`,
    up:      'ارتفاع',
    down:    'انخفاض',
  },

  movers: {
    eyebrow:  'لوحة السوق',
    title:    'أبرز الشركات',
    all:      'جميع الشركات',
    search:   'ابحث عن شركة',
    searchPlaceholder: 'ابحث عن شركة...',
    tablist:  'تصنيف الشركات',
    tabMcap:  'القيمة السوقية',
    tabGainers:'الرابحون',
    tabLosers:'الخاسرون',
    tabActive:'الأكثر نشاطاً',

    colCompany: 'الشركة',
    colPrice:   'آخر سعر',
    colChange:  'التغير',
    colVolume:  'حجم التداول',
    colTrend:   'اتجاه 7 جلسات',
    captionCap:     (n: string) => `${n} شركة مرتّبة حسب القيمة السوقية · لقطة على سجل الشركات`,
    captionSession: (n: string, d: string) => `${n} شركة في جلسة ${d}`,
    close:          'إغلاق',
    valueCapMode:   'القيمة السوقية',
    valueTradeMode: 'قيمة التداول',

    /** The market-cap footnote. It states the formula, says the figure is a
     *  snapshot of the register rather than an official ranking, and says
     *  plainly that excluded companies are EXCLUDED — not counted as zero. */
    capNote:
      'القيمة السوقية = آخر سعر تداول × الأسهم المصدرة، بالقيمة نفسها المعروضة في صفحتي السوق والشركات · '
      + 'لقطة على سجل الشركات لا ترتيب رسمي معتمد. الشركات التي لا يتوفر لها سعر أو عدد أسهم مستبعدة، ولا تُحتسب صفراً.',
  },
}
