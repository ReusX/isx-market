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
}
