/**
 * /statistics — إحصاءات السوق.
 *
 * ── Every panel says which window it covers ───────────────────────────────
 * This route mixes four different time scopes on one screen: the selected
 * period, a fixed snapshot, a single calendar month, and the foreign-flow
 * window which follows neither. The scope line under each heading is not
 * decoration — without it a reader compares a period total against a snapshot
 * and concludes the data is wrong.
 *
 * ── Exclusions are exclusions, never zeros ────────────────────────────────
 * Repeated deliberately in several places because it is the single most
 * important fact about these figures: a company with no value for a measure is
 * left OUT of the ranking, not counted as zero. Same for P/E, which exists
 * only for companies with positive published earnings.
 *
 * ── What the product refuses to claim ─────────────────────────────────────
 * Market-cap share is NOT an ISX60 index weight — the weights are unpublished
 * and this product does not store them. Dividend yield is a key in
 * `financial_ratios` with near-zero coverage, so it is shown as unavailable
 * with the reason rather than shown thinly and read as complete.
 */
export const statistics = {
  title: 'إحصاءات السوق',
  standfirst: (from: string, to: string) =>
    `حجم السوق ونشاطه وتركّزه وتقييمه — السلسلة المخزّنة من ${from} حتى ${to}.`,

  /* Scope lines, one per mode. */
  scopePeriod: (from: string, to: string, sessions: string) =>
    `الأرقام في هذا القسم تتبع الفترة المحددة · ${from} — ${to} · ${sessions} جلسة`,
  scopeOwn: (from: string, to: string) =>
    `نافذة خاصة بهذا القسم — لا تتبع الفترة المحددة${from ? ` · ${from} — ${to}` : ''}`,
  scopeMonth: (month: string) => `شهر واحد — لا يتبع الفترة المحددة · ${month}`,
  scopeSnapshot: (close: string) => `لقطة حالية — لا تتبع الفترة المحددة · آخر إغلاق ${close}`,

  railLabel: 'ملخص الفترة',
  railLoading: 'جاري تحميل السلسلة…',
  railEmpty:   'لا توجد جلسات في هذه الفترة.',
  railValue:   'قيمة التداول · الفترة المحددة',
  iqd: 'د.ع',
  vsPrior: 'عن الفترة السابقة',
  noPrior: 'لا توجد فترة سابقة بالطول نفسه',
  sessionAverage: 'متوسط الجلسة',
  sessionMedian:  'وسيط الجلسة',
  meanTraded:     'متوسط الشركات المتداولة',
  sessions:       'عدد الجلسات',

  tabsLabel: 'أقسام الإحصاءات',
  periodLabel: 'الفترة',

  loadFailedTitle: 'تعذّر تحميل بيانات الإحصاءات',
  loadFailedNote:  'لم نتمكن من الوصول إلى السلسلة المخزّنة.',
  retry: 'إعادة المحاولة',

  /* ── Activity ─────────────────────────────────────────────────────────── */
  activity: 'النشاط',
  activityTitle: 'نشاط السوق',
  metricLabel: 'المقياس',
  periodTotal: 'مجموع الفترة',
  tradedCompanies: 'الشركات المتداولة',
  coverage: 'التغطية',
  ofListed:   (n: string) => `من ${n}`,
  ofSessions: (n: string) => `من ${n} جلسة`,
  perSessionNote: (gapNote: string) =>
    `المتوسط لكل جلسة تداول لا لكل يوم تقويمي — السوق يعمل خمسة أيام من سبعة، والقسمة على أيام التقويم تخفض كل متوسط بنحو 29%.${gapNote}`,
  perSessionGap: (n: string) => ` · ${n} جلسة بلا قياس لهذا المقياس، وتظهر فجوات في الرسم لا أصفاراً.`,

  /* ── Market cap / structure ───────────────────────────────────────────── */
  structure: 'القيمة السوقية',
  structureTitle: 'القيمة السوقية',
  noCapData: 'لا تتوفر بيانات القيمة السوقية',
  topTenOf: (total: string) => `أكبر عشر شركات من إجمالي ${total} د.ع`,
  concentration: 'التركّز',
  concentrationNote: 'أين تجلس قيمة السوق — سؤال مختلف عن أين يجلس نشاطه.',
  largestCompany: 'أكبر شركة',
  top5: 'أكبر 5 · من القيمة السوقية',
  top10: 'أكبر 10 · من القيمة السوقية',
  capFormula: (included: string, universe: string, official: string, excluded: string) =>
    `القيمة السوقية = آخر إغلاق منشور × الأسهم المصدرة · ${included} من ${universe} شركة في السجل الحالي`
    + (official ? ` (العدد الرسمي ${official})` : '')
    + (excluded ? ` · استُبعدت ${excluded} لعدم توفر عدد الأسهم` : '') + '.',
  staleNote: (n: string, share: string) =>
    `${n} شركة مُسعّرة بإغلاق أقدم من 60 يوماً — إغلاق منشور فعلي، وليس سعراً حالياً — وتمثّل ${share} من الإجمالي.`,
  notIndexWeight: ' حصة القيمة السوقية ليست وزناً في مؤشر ISX60 — أوزان المؤشر غير منشورة ولا يخزّنها المنتج.',

  /* ── Sectors ──────────────────────────────────────────────────────────── */
  sectors: 'القطاعات',
  sectorMetric: 'مقياس القطاع',
  noSectorActivity: 'لا تتوفر بيانات نشاط القطاعات',
  noSectorActivityNote: 'تعذّر تحميل الجدول الشهري للقطاعات. القيمة السوقية لا تزال متاحة.',
  noSectorData: 'لا تتوفر بيانات القطاعات',
  sectorsLabel: 'إحصاءات القطاعات',
  sectorSnapshot: (n: string, total: string) => `${n} قطاعاً · لقطة القيمة السوقية · إجمالي ${total} د.ع`,
  sectorMonth: (month: string, n: string, total: string) => `شهر ${month} · ${n} قطاعاً · إجمالي ${total}`,
  close: 'إغلاق',
  marketCap: 'القيمة السوقية',
  capShare: 'حصة القيمة السوقية',
  companies: 'الشركات',
  tradedValueMonth: 'قيمة التداول · الشهر',
  volume: 'الحجم',
  trades: 'الصفقات',
  tradedCos: 'شركات تداولت',
  listedCos: 'شركات مدرجة',
  mixedScopeNote: 'القيمة السوقية لقطة حالية من سجل الشركات؛ أرقام النشاط لشهر تقويمي واحد. الرقمان لا يغطيان النافذة نفسها.',
  pickSector: 'اختر قطاعاً لعرض تفاصيله.',
  sectorSourceNote:
    'القيمة السوقية للقطاع مجموعة من سجل الشركات (آخر إغلاق × الأسهم المصدرة) لا من العمود الشهري، لأن ذلك العمود يحتسب الشركات مرتين عبر صفوف الأسماء القديمة. عدد الشركات المدرجة غير متوفر في المصدر الشهري ويظهر —.',
  reconNote: (raw: string, dropped: string) =>
    `من ${raw} صفاً في المصدر استُبعد ${dropped} صف مكرر بلا نشاط، ووحّدت الأسماء التاريخية — دون فقدان أي نشاط.`,

  /* ── Companies ────────────────────────────────────────────────────────── */
  companiesTab: 'الشركات',
  noCompanyData: 'لا تتوفر بيانات الشركات',
  rankingLabel: 'ترتيب الشركات',
  rankingTitle: 'ترتيب الشركات',
  rankedOf: (n: string, total: string) => `${n} من ${total} شركة لها قيمة لهذا المقياس`,
  excludedNotZero: 'الشركات التي لا تملك قيمة لهذا المقياس مستبعدة من الترتيب، ولا تُحسب صفراً.',
  rankingMeasure: 'مقياس الترتيب',
  company: 'الشركة',
  share: 'الحصة',
  oldClose: 'إغلاق قديم',
  showFirst12: 'عرض أول 12 فقط',
  showAllN: (n: string) => `عرض جميع الـ ${n}`,
  rankedBy: (unit: string) => `الشركات مرتبة حسب ${unit}`,
  showAll: 'عرض الكل',
  lastClose: 'آخر إغلاق',
  pe: 'مكرر الربحية',

  /* ── Valuation ────────────────────────────────────────────────────────── */
  valuation: 'التقييم',
  noPe: 'لا تتوفر مكررات ربحية',
  noPeNote: 'تُحتسب من البيانات المالية المنشورة، وهي غير متوفرة لهذه الجلسة.',
  peTitle: 'مكرر الربحية',
  peCoverage: (n: string, universe: string, pct: string) => `${n} من ${universe} شركة · تغطية ${pct}`,
  peExcluded: 'يُحسب المكرر للشركات ذات الأرباح الموجبة فقط؛ الشركات الخاسرة أو التي لا تتوفر أرباحها مستبعدة ولا تُحسب صفراً.',
  median: 'الوسيط',
  mean: 'المتوسط',
  lowest: 'الأدنى',
  highest: 'الأعلى',
  medianFirst: 'الوسيط أولاً: حفنة من المكررات المرتفعة تسحب المتوسط إلى مستوى لا تتداول عنده أي شركة. الفارق بين الرقمين هو انحراف التوزيع نفسه، لا خطأ فيه.',
  extremePe: ' الحد الأعلى مكرر شركة أرباحها المخزّنة قريبة من الصفر، فيخرج الرقم بالملايين. هو ناتج القسمة فعلاً، لا خطأ في العرض — ولهذا يقود الوسيط لا المتوسط.',
  distribution: 'التوزيع',
  binsNote: (n: string) => `فئات منفصلة لا منحنى: بـ${n} مشاهدة، أي تنعيم يرسم شكلاً لا تملكه البيانات.`,
  dividendYield: 'عائد التوزيعات',
  unavailable: 'غير متاح',
  why: 'لماذا؟',
  dividendWhy: 'عوائد التوزيعات موجودة في المنتج كمفتاح نسبة داخل financial_ratios، لكن استخراج البيانات المالية لم يُشغَّل لأغلب الشركات، فالتغطية قريبة من الصفر. عرضها الآن سيوحي بشمولٍ غير موجود.',
  under5: 'أقل من 5',
  over40: 'أكثر من 40',

  /* ── Foreign flow ─────────────────────────────────────────────────────── */
  foreign: 'المستثمر الأجنبي',
  noForeign: 'لا تتوفر بيانات التدفق الأجنبي',
  details: 'التفاصيل',
  foreignTitle: 'التدفق الأجنبي',
  foreignWindow: (from: string, to: string, sessions: string) =>
    `نافذة هذا القسم · ${from} — ${to} · ${sessions} جلسة`,
  fullPage: 'الصفحة الكاملة',
  cumulativeNet: 'الصافي التراكمي',
  buyMonths: (up: string, total: string) => `${up} من ${total} شهراً بصافي شراء`,
  totalBuying: 'إجمالي الشراء',
  totalSelling: 'إجمالي البيع',
  months: 'الأشهر',
  monthlyNet: 'صافي التدفق الشهري',
  foreignFoot: (counted: string, missing: string) =>
    `شهري ومجمَّع من السلسلة نفسها التي تستخدمها صفحة التدفق الكاملة، فالرقمان لا يختلفان · ${counted} جلسة برصد فعلي`
    + (missing ? ` و${missing} جلسة بلا بيانات لم تُحتسب` : '') + '. التفصيل حسب الشركة والقطاع في ',

  /* ── Chart ────────────────────────────────────────────────────────────── */
  chartCanvasLabel: (n: string, max: string) => `${n} فترة · القيمة القصوى ${max}`,
  chartSessions: 'جلسات',
  chartPerSession: 'المعدل لكل جلسة',
  chartUnmeasured: 'بلا رصد',
  chartHint: 'مرّر أو انقر على العمود لقراءة القيمة الدقيقة',
  copyImage: 'نسخ الصورة',
  downloadPng: 'تنزيل PNG',
  copied: 'نُسخت الصورة',
  downloaded: 'تم التنزيل',
  copyFailed: 'تعذّر النسخ · استخدم التنزيل',
}
