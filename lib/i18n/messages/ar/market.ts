/**
 * /market — the board.
 *
 * ── Every column says what it measures ────────────────────────────────────
 * The English side of this route used to abbreviate under pressure: `Last`,
 * `Value`, `Mkt cap`, `sh`. Each of those is a different metric from the one a
 * reader would guess — `Value` in particular is the exact ambiguity that
 * shipped as a bug on the homepage — so they are all written out. Column
 * headers are read once and trusted forever; the four characters saved are not
 * worth the reading they cost.
 *
 * ── The four breadth states stay four ─────────────────────────────────────
 * رابحة / خاسرة / دون تغير / بلا إغلاق سابق. The fourth is NOT «unchanged»:
 * a share with no previous close has an UNKNOWN change, not a zero one, and
 * folding them together would silently move companies into a count they do not
 * belong in.
 *
 * ── «آخر نشرة», never «مباشر» ─────────────────────────────────────────────
 * ISX publishes one bulletin per trading day. There is no intraday feed and
 * therefore no «open» state this product can honestly claim, in either
 * language.
 */
export const market = {
  title:        'السوق',
  bulletin:     'آخر نشرة',
  session:      'الجلسة',
  traded:       'المتداولة',
  companies:    'الشركات',
  of:           'من',

  summaryLabel: 'أداء الجلسة',
  breadth:      'اتساع السوق',
  tradedValue:  'قيمة التداول',
  volume:       'حجم التداول',
  trades:       'عدد الصفقات',
  mostActive:   'الأكثر نشاطاً',
  unitShares:   'سهم',

  /** The four breadth states, as counted on the summary strip. */
  up:      'رابحة',
  flat:    'دون تغير',
  down:    'خاسرة',
  noPrior: 'بلا إغلاق سابق',

  filterTabs:   'تصنيف الشركات',
  tabAll:       'الكل',
  tabGainers:   'الرابحون',
  tabLosers:    'الخاسرون',
  tabActive:    'الأكثر نشاطاً',

  searchLabel:  'بحث في الشركات',
  searchPlaceholder: 'ابحث باسم الشركة أو الرمز…',
  clearSearch:  'مسح البحث',
  sectorLabel:  'تصفية حسب القطاع',
  listingLabel: 'حالة الإدراج',
  active:       'نشطة',
  suspended:    'موقوفة',
  watchlist:    'قائمة المتابعة',
  clearFilters: 'مسح الفلاتر',
  countUnit:    'شركة',

  suspendedNote: (days: string) =>
    `أسهم لم تُتداول منذ أكثر من ${days} يوماً. السعر المعروض هو آخر صفقة فعلية بتاريخها، وليس سعراً حالياً — ولهذا لا تُحتسب لها قيمة سوقية.`,

  loadFailedTitle: 'تعذّر تحميل جدول السوق',
  loadFailedNote:  'لم نتمكن من الوصول إلى بيانات الجلسة.',
  retry:           'إعادة المحاولة',

  tableLabel: 'جدول الشركات',
  rank:       'الترتيب',
  watch:      'متابعة',
  colCompany: 'الشركة',
  colPrice:   'آخر سعر',
  colChange:  'التغير',
  colPct:     'التغير ٪',
  colVolume:  'حجم التداول',
  colValue:   'قيمة التداول',
  colTrades:  'عدد الصفقات',
  colMcap:    'القيمة السوقية',
  colTrend:   'اتجاه 7 جلسات',

  rowSuspended: 'موقوف',
  rowNoTrade:   'لم تُتداول',

  sortedAsc:  'مرتّب تصاعدياً',
  sortedDesc: 'مرتّب تنازلياً',
  notSorted:  'غير مرتّب',
  noValue:    'لا تتوفر بيانات',
  breadthReading: (up: string, flat: string, down: string, na: string, traded: string) =>
    `${up} رابحة، ${flat} دون تغير، ${down} خاسرة، ${na} بلا إغلاق سابق، من ${traded} متداولة`,
  caption:    (date: string, n: string) => `حركة أسهم بورصة العراق لجلسة ${date} · ${n} شركة`,
  watchOf:    (sym: string) => `متابعة ${sym}`,

  footnote: (date: string) =>
    `الأسعار من النشرة الرسمية لبورصة العراق لجلسة ${date} · القيمة السوقية = آخر سعر × الأسهم المصدرة · الشركات التي لم تُتداول في الجلسة تظهر بآخر سعر فعلي لها دون تغيّر أو حجم.`,

  empty: {
    title:  'لا توجد شركات مطابقة',
    note:   'لم تُطابق أي شركة في هذه الجلسة الفلاتر المطبّقة حالياً.',
    search: 'بحث',
    tab:    { all: '', gainers: 'الرابحون', losers: 'الخاسرون', active: 'الأكثر نشاطاً' },
    move:   { all: '', up: 'رابحة', flat: 'دون تغير', down: 'خاسرة', na: 'بلا إغلاق سابق' },
    watchlist: 'قائمة المتابعة',
    reset:  'مسح جميع الفلاتر',
  },
  /** The rebuilt /market (redesign). */
  page: {
    eyebrow:   'الأسواق',
    lede:      'كل شركة مدرجة في بورصة العراق: آخر سعر، التغيّر، وقيمة التداول — لجلسة واحدة، مرتّبة حسب الأنشط.',
    index:     'مؤشر ISX60',
    tradedOf:  (n: string, total: string) => `${n} من أصل ${total} تم تداولها`,
    sessionOf: (date: string) => `جلسة ${date}`,
    rail: { market: 'السوق', board: 'جدول الشركات', companies: 'الشركات', screener: 'مستكشف الأسهم', heatmap: 'خريطة السوق', statistics: 'الإحصاءات', pulse: 'نبض السوق' },
    showing:   (n: string) => `${n} شركة`,
    /** /market · the full board. */
    full: {
      title:   'جدول أسعار جميع شركات بورصة العراق',
      intro:   'كل الشركات المدرجة في سوق الأسهم العراقي أو سوق العراق للأوراق المالية: آخر سعر، التغيّر، حجم التداول، القيمة السوقية وعدد الأسهم. اختر أي جلسة سابقة لعرض أسعارها، أو رتّب الجدول بأي عمود.',
      session: 'الجلسة',
      latest:  'أحدث جلسة',
      prev:    'الجلسة السابقة',
      next:    'الجلسة التالية',
      pick:    'اختر تاريخاً',
      csv:     'تنزيل CSV',
      noSession: (d: string) => `لا توجد جلسة تداول في ${d}. اختر يوماً آخر.`,
      listing: { all: 'الكل', traded: 'تم تداولها', untraded: 'لم تُتداول', suspended: 'موقوفة' },
      suspended: (d: string) => `موقوفة عن التداول · آخر تداول ${d}`,
      about: {
        title: 'عن هذا الجدول',
        body: [
          'الأسعار من نشرة التداول اليومية لبورصة العراق للأوراق المالية، وتُحدَّث بعد إغلاق كل جلسة. الجلسات من الأحد إلى الخميس، وقد تُلغى في العطل الرسمية.',
          'التغيّر هو الفرق بين إغلاق الجلسة وإغلاق الجلسة التي سبقتها. تغيّر 7 أيام و30 يوماً يُقاس على آخر إغلاق قبل تلك المدة بالأيام التقويمية.',
          'حجم التداول هو عدد الأسهم التي تبادلت أيديها في الجلسة، وقيمة التداول هي ثمنها بالدينار. القيمة السوقية هي آخر سعر مضروباً في عدد الأسهم المصدرة.',
          'الشركة التي لم تُتداول في الجلسة تحتفظ بآخر سعر لها ولا يُحتسب لها تغيّر. الشركة الموقوفة هي التي لم تُتداول لأكثر من ستين يوماً.',
        ],
      },
      faq: {
        title: 'أسئلة شائعة',
        items: [
          ['متى تُحدَّث الأسعار؟', 'بعد إغلاق كل جلسة تداول، عادةً بعد الظهر بتوقيت بغداد. لا تتوفر أسعار لحظية خلال الجلسة.'],
          ['ما الفرق بين حجم التداول وقيمة التداول؟', 'الحجم عدد الأسهم، والقيمة ثمنها بالدينار. سهم بسعر دينار واحد يعطي قيمة صغيرة مهما كبر الحجم.'],
          ['لماذا لا يظهر تغيّر لبعض الشركات؟', 'لأنها لم تُتداول في تلك الجلسة؛ سعرها المعروض هو آخر سعر تداولت به، ولا معنى لتغيّر بلا صفقة.'],
          ['هل يمكن عرض أسعار جلسة سابقة؟', 'نعم. اختر التاريخ من أداة الجلسة أعلى الجدول، أو تنقّل بين الجلسات بالأسهم.'],
        ],
      },
    },
    board: {
      title:    'جدول الشركات',
      price:    'السعر',
      d1:       '24 ساعة',
      d7:       '7 أيام',
      d30:      '30 يوماً',
      volume:   'حجم التداول',
      shares:   'عدد الأسهم',
      mcap:     'القيمة السوقية',
      untraded: 'لم تُتداول هذه الجلسة',
      streak:   (n: number) => n === 2 ? 'لم تُتداول منذ جلستين' : n <= 10 ? `لم تُتداول منذ ${n} جلسات` : `لم تُتداول منذ ${n} جلسة`,
      showAll:  (n: string) => `عرض كل الشركات (${n})`,
      sortNote: 'مرتّبة حسب حجم التداول',
    },
    vsAvg:     (pct: string) => `${pct} عن متوسط 20 جلسة`.trim(),
    breadth:   { label: 'حركة الشركات', up: 'صاعدة', down: 'منخفضة', flat: (n: string) => `${n} بلا تغيير` },
    untraded:  'لم تُتداول',
    noChange:  'بلا تغيّر',
    emptyTitle: 'لا نتائج',
    emptyNote:  'جرّب اسماً آخر أو أزل التصفية.',
    loadFailed: 'تعذّر تحميل السوق. حاول مرة أخرى بعد قليل.',
    /** The two openers: the ISX60 chart and the foreign-flow ring. */
    chart: {
      title:   'مؤشر ISX60',
      which:   'المؤشر',
      series:  { isx60: 'ISX60', rsisx: 'RSISX' },
      ranges:  { m1: 'شهر', m3: '3 أشهر', y1: 'سنة', y3: '3 سنوات', all: 'الكل' },
      high:    'الأعلى',
      low:     'الأدنى',
      since:   (d: string) => `منذ ${d}`,
      label:   'مخطط مؤشر ISX60',
      empty:   'لا تتوفر بيانات المؤشر.',
      full:    'عرض المخطط الكامل',
    },
    flow: {
      title:   'تدفق المستثمر الأجنبي',
      buy:     'شراء',
      sell:    'بيع',
      net:     'الصافي',
      netBuy:  'صافي شراء',
      netSell: 'صافي بيع',
      even:    'متوازن',
      periods: { session: 'الجلسة', month: 'آخر 20 جلسة' },
      label:   (buy: string, sell: string) => `شراء أجنبي ${buy}، بيع أجنبي ${sell}`,
      empty:   'لا تتوفر بيانات تدفق أجنبي.',
      full:    'إحصاءات التدفق الأجنبي كاملة',
      note:    'حصة كل جهة من إجمالي التداول الأجنبي.',
      strip:   'مرّر على جلسة لعرضها في الدائرة · المقياس لوغاريتمي',
    },
  },
}
