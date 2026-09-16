/**
 * /screener — رادار الأسهم.
 *
 * The route's metric, period, preset and sector NAMES are not here: they are
 * typed bilingual definition tables in `lib/screener.ts`, beside the logic that
 * uses them. What lives here is the page's own chrome — headings, controls,
 * empty and failure states, and the footnote that explains what each column is
 * actually measuring.
 *
 * ⚠ The footnote is the most load-bearing sentence on the page and it must
 * keep every qualifier it has: the P/E is TRAILING TWELVE MONTHS and appears
 * only for profitable companies whose financials exist; liquidity is a 20-
 * session average, not a session figure; there is no dividend or book-value
 * data in the source, so the screener does not offer those filters.
 */
export const screener = {
  title:      'رادار الأسهم',
  standfirst: 'صفِّ شركات بورصة العراق حسب الأداء والسيولة والتقييم وتدفق الأجانب.',

  workspace:  'أدوات الفرز',
  searchLabel: 'بحث في الشركات',
  searchPlaceholder: 'ابحث باسم الشركة أو الرمز…',
  clearSearch: 'مسح البحث',
  sectorLabel: 'تصفية حسب القطاع',
  allSectors:  'كل القطاعات',
  periodLabel: 'فترة المقارنة',
  changeOver:  'التغيّر خلال',
  advanced:    'فلاتر متقدمة',
  filters:     'الفلاتر',
  quickStarts: 'بدايات سريعة',

  min: 'من',
  max: 'إلى',
  minOf: (metric: string) => `${metric} — الحد الأدنى`,
  maxOf: (metric: string) => `${metric} — الحد الأعلى`,
  clearFilterOf: (metric: string) => `مسح فلتر ${metric}`,

  tokenSector: 'القطاع',
  tokenSearch: 'بحث',
  removeSector: 'إزالة فلتر القطاع',
  removeSearch: 'إزالة البحث',
  removeFilterOf: (metric: string) => `إزالة فلتر ${metric}`,
  noFilters: 'لا فلاتر مطبّقة · يُعرض السوق كاملاً',
  reset: 'إعادة ضبط',
  matchingOf: 'شركة مطابقة من',
  invalidRange: (metrics: string) => `الحد الأدنى أكبر من الأعلى في: ${metrics} — لن تطابق أي شركة.`,

  listingLabel: 'حالة الإدراج',
  active:    'نشطة',
  suspended: 'موقوفة',

  peFailed: 'تعذّر تحميل مكرر الربحية. باقي المقاييس مكتملة، والفرز على المكرر غير متاح مؤقتاً.',
  loadFailedTitle: 'تعذّر تحميل بيانات الفرز',
  loadFailedNote:  'لم نتمكن من الوصول إلى مقاييس الشركات. الفلاتر التي اخترتها محفوظة وستُطبَّق عند إعادة المحاولة.',
  retry: 'إعادة المحاولة',

  resultsLabel: 'نتائج الفرز',
  caption: (n: string) => `نتائج رادار الأسهم · ${n} شركة`,
  colCompany:   'الشركة',
  colPrice:     'السعر',
  colChange:    'التغيّر',
  colPe:        'مكرر الربحية',
  colBand:      'مدى 52 أسبوعاً',
  colLiquidity: 'السيولة اليومية',
  colForeign:   'صافي الأجانب 30 يوماً',
  colMcap:      'القيمة السوقية',
  colSector:    'القطاع',

  sortedAsc:  'مرتّب تصاعدياً',
  sortedDesc: 'مرتّب تنازلياً',
  notSorted:  'غير مرتّب',
  noMeasure:  'لا يتوفر قياس',
  noReference:'لا يتوفر إغلاق مرجعي لهذه الفترة',
  peUnavailable: 'لا تتوفر بيانات مالية أو الشركة غير رابحة',
  peLoadFailed:  'تعذّر التحميل',

  emptyTitle: 'لا توجد شركات مطابقة',
  /* The advice is specific because the generic version — «جرّب فلاتر أخرى» —
     tells a reader nothing they had not already worked out. */
  emptyNote:  'لم تُطابق أي شركة كل الشروط معاً. جرّب توسيع أضيق شرط بدل مسح الكل.',
  emptySearch:'بحث',
  emptyReset: 'إعادة ضبط الفلاتر',

  filtersCompose: 'الفلاتر تعمل معاً — على الشركة أن تحقق كل الشروط. الشركات التي لا يتوفر لها قياس معيّن تُستبعد من أي فلتر على ذلك القياس، وتبقى مشمولة بالفلاتر الأخرى · «التغيّر» يتبع الفترة المختارة أعلاه.',
  footnote:
    'المقاييس محسوبة على آخر نشرة رسمية لكل سهم · السيولة = متوسط قيمة التداول اليومية خلال 20 جلسة · '
    + 'القيمة السوقية = آخر سعر × الأسهم المصدرة · مكرر الربحية على آخر 12 شهراً (TTM) ويظهر فقط للشركات الرابحة '
    + 'التي تتوفر بياناتها المالية · لا تتوفر بيانات توزيعات أرباح أو قيمة دفترية في المصدر.',

  suspendedNote: (days: string) =>
    `أسهم لم تُتداول منذ أكثر من ${days} يوماً · مقاييس الأداء والتقييم محسوبة على سعر قديم، ولا تُحتسب لها قيمة سوقية.`,
  listSeparator: '، ',

  sheetClose: 'إغلاق',
  sheetMatching: 'شركة مطابقة',
  show: 'عرض',
  results: 'نتيجة',
  /** The rebuilt /screener (redesign). */
  page: {
    eyebrow:  'الأسواق',
    lede:     'اختر فلتراً جاهزاً من الأعلى، أو حدّد شروطك بنفسك من «فلاتر متقدمة». تظهر فقط الشركات التي تنطبق عليها كل الشروط.',
    presets:  'فلاتر جاهزة',
    coverage: (n: string, total: string) => `مكرر الربحية متاح لـ ${n} من ${total} شركة`,
    showSuspended: 'إظهار الموقوفة',
    asOf:     (d: string) => `المقاييس محسوبة على جلسة ${d}`,
    lagging:  (d: string, m: string) => `المقاييس محسوبة على جلسة ${d} بينما آخر جلسة ${m} — تُحدَّث قريباً.`,
    csv:      'تنزيل CSV',
    share:    'نسخ رابط هذا الفرز',
    copied:   'تم نسخ الرابط',
    titles: {
      all:      'رادار الأسهم العراقية · فلترة أسهم بورصة العراق',
      gainers:  'الأسهم العراقية الرابحة · بورصة العراق',
      losers:   'الأسهم العراقية الخاسرة · بورصة العراق',
      liquid:   'الأسهم الأكثر سيولة في بورصة العراق',
      cheap:    'أرخص الأسهم العراقية بالمكرر الربحي',
      fbuy:     'الأسهم التي يشتريها الأجانب في بورصة العراق',
      fsell:    'الأسهم التي يبيعها الأجانب في بورصة العراق',
      nearhigh: 'الأسهم العراقية القريبة من قمة 52 أسبوعاً',
      nearlow:  'الأسهم العراقية القريبة من قاع 52 أسبوعاً',
      largest:  'أكبر الشركات في بورصة العراق بالقيمة السوقية',
      monthup:  'الأسهم العراقية الصاعدة هذا الشهر',
    } as Record<string, string>,
    about: {
      title: 'كيف يعمل الرادار',
      body: [
        'الرادار يفرز شركات بورصة العراق بسبعة مقاييس: السعر، التغيّر خلال فترة تختارها، الموقع داخل مدى 52 أسبوعاً، السيولة اليومية، القيمة السوقية، صافي تداول الأجانب خلال 30 يوماً، ومكرر الربحية.',
        'الجاهزات هي شروط مكتوبة مسبقاً، لا أوضاع مخفية: اضغط «الأقل مكرراً» فيظهر الشرط «مكرر الربحية ≤ 10» ويمكنك تعديله أو إضافة شرط آخر إليه. كل فرز له رابط يمكن مشاركته.',
        'مكرر الربحية يعتمد على القوائم المالية المنشورة، ولا يتوفر إلا للشركات الرابحة التي نشرت بياناتها. الشركات الموقوفة عن التداول لأكثر من ستين يوماً تُخفى افتراضياً لأن مقاييسها محسوبة على سعر قديم.',
      ],
    },
  },
}
