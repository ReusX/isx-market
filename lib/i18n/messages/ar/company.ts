/**
 * /c/[sym] — the company page.
 *
 * ── The price is a LAST TRADE, not a live quote ───────────────────────────
 * «آخر صفقة فعلية» and the date beside it are the whole honesty of this page.
 * A suspended or quiet share shows the last price it actually traded at, on
 * its own date, and the 52-week band is relabelled «مدى آخر 52 أسبوع تداول»
 * so it is not read as a current range.
 *
 * ── Banks are measured differently, and it says so ────────────────────────
 * Banks do not disclose a single revenue line, so operating income is net
 * financing income plus net commissions — and net margin is therefore NOT
 * shown for them. That sentence is a fact about the accounting, not a caveat
 * to be trimmed in translation.
 *
 * ── Missing financials say what IS still available ────────────────────────
 * A company with no extracted statements gets a panel naming exactly what the
 * page can still show, rather than an empty space that reads as a broken page.
 */
export const company = {
  /* ── دليل الشركات · /companies ─────────────────────────────────────────
     هذه الصفحة هي المسار الوحيد الذي يستطيع الزاحف عبوره إلى صفحات الشركات:
     كل جدول أسعار في الموقع يجلب صفوفه في المتصفح، فلا يصل الزاحف إلى أي
     رابط شركة إلا من هنا. */
  directory: {
    eyebrow: 'دليل الشركات',
    h1: (n: string) => `الشركات المدرجة في بورصة العراق · ${n} شركة حسب القطاع`,
    standfirst: (n: string) => `${n} شركة مدرجة في بورصة العراق للأوراق المالية (ISX)، مرتّبة حسب القطاع مع آخر سعر والقيمة السوقية.`,
    indexTitle: 'كل الشركات المدرجة حسب القطاع',
    loading: 'جاري التحميل…',
    count: (n: string) => `${n} شركة`,
    searchPlaceholder: 'ابحث عن شركة أو رمز…',
    searchLabel: 'بحث عن شركة',
    colCompany: 'الشركة',
    colLast: 'آخر سعر',
    colChange: 'التغير',
    colVolume: 'الحجم',
    colMcap: 'القيمة السوقية',
    staleNote: (days: string) => `أسهم لم تُتداول منذ أكثر من ${days} يوماً. السعر المعروض هو آخر صفقة فعلية بتاريخها، وليس سعراً حالياً — ولهذا لا تُحتسب لها قيمة سوقية.`,
    loadFailed: 'تعذّر تحميل بيانات الشركات',
    loadFailedHint: 'يرجى تحديث الصفحة.',
    noMatch: 'لا توجد شركات مطابقة',
    noMatchHint: 'جرّب تغيير القطاع أو مسح البحث.',
  },

  tabs: {
    overview:     'نظرة عامة',
    chart:        'السعر',
    fundamentals: 'الأساسيات',
    ownership:    'الملكية',
    about:        'عن الشركة',
  },

  market: 'السوق',
  companies: 'الشركات',
  exchange: 'بورصة العراق',

  lastActualTrade: 'آخر صفقة فعلية',
  lastTradedOn: (d: string) => `آخر تداول ${d}`,
  sessionClose: (d: string) => `إغلاق جلسة ${d}`,
  latestAvailable: 'آخر جلسة متاحة',
  watching: 'في المتابعة',
  watch: 'متابعة',

  band52: 'مدى 52 أسبوعاً',
  band52Stale: 'مدى آخر 52 أسبوع تداول',
  bandPosition: (pct: string) => `السعر عند ${pct} من مدى 52 أسبوعاً`,

  ratiosNote: (year: string) => `النسب محسوبة على آخر سنة مالية مكتملة (${year}) وآخر ربع مُعلن.`,
  fullFinancials: 'القوائم المالية الكاملة',
  noFundamentals: 'الأساسيات غير معروضة لهذه الشركة حالياً',
  stillAvailable: 'ما يزال متوفراً',
  stillAvailableNote: (withOwnership: boolean) =>
    `السعر التاريخي، بيانات الجلسة، القيمة السوقية، والأداء مقابل المؤشر${withOwnership ? '، وبيانات الملكية' : ''}.`,
  ownershipNote: (month: string, year: string) => `وفق إيداعات ${month}/${year} لدى مركز الإيداع.`,

  noSession: 'لا توجد بيانات جلسة',
  noSessionWithDate: (d: string) => `آخر صفقة فعلية على هذا السهم كانت بتاريخ ${d} بسعر `,
  noSessionNoDate: 'آخر سعر مسجّل هو ',

  sessionRange: 'نطاق الجلسة',
  rangeLabel: (low: string, high: string, close: string) => `أدنى ${low} وأعلى ${high} والإغلاق ${close}`,
  low: 'أدنى',
  high: 'أعلى',
  volume: 'الحجم',
  sharesUnit: 'سهم',

  vsIndex: 'الأداء مقابل المؤشر',
  vsIndexNote: 'عوائد سعرية تراكمية · المؤشر المرجعي',
  ytd: 'منذ بداية العام',
  y1: 'سنة',
  y3: '3 سنوات',
  y5: '5 سنوات',

  foreignTrading: 'تداول المستثمرين الأجانب',
  lastNSessions: (n: string) => `آخر ${n} جلسة مسجّلة`,
  netFlow: 'صافي التدفق',
  netBuy: 'شراء صافٍ',
  netSell: 'بيع صافٍ',
  buySellBar: (buy: string, sell: string) => `شراء ${buy} وبيع ${sell}`,
  buy: 'شراء',
  sell: 'بيع',

  marketCap: 'القيمة السوقية',
  pe: 'مكرر الربحية',
  pb: 'السعر / القيمة الدفترية',
  ps: 'السعر / المبيعات',
  eps: 'ربحية السهم',
  bvps: 'القيمة الدفترية للسهم',
  dividendYield: 'عائد التوزيعات',
  operatingIncome: 'الدخل التشغيلي',
  revenue: 'الإيرادات',
  netProfit: 'صافي الربح',
  roa: 'العائد على الأصول',
  roe: 'العائد على حقوق الملكية',
  capitalAdequacy: 'كفاية رأس المال',
  loanToDeposit: 'القروض إلى الودائع',
  netMargin: 'هامش صافي الربح',
  debtToEquity: 'الدين إلى حقوق الملكية',

  profitabilityBank: 'الربحية والملاءة',
  profitability: 'الربحية والمركز المالي',
  bankMarginNote: 'المصارف لا تُفصح عن سطر إيرادات واحد؛ يُحتسب الدخل التشغيلي كصافي دخل التمويل مضافاً إليه صافي العمولات، ولذلك لا يُعرض هامش صافي الربح.',

  incomeBank: 'الدخل التشغيلي والأرباح',
  incomeCorp: 'الإيرادات والأرباح',
  quarterly: 'ربعي',
  annual: 'سنوي',
  margin: 'الهامش',

  ownershipMix: 'تركيبة الملكية',
  ownershipBar: (iraqi: string, foreign: string) => `عراقي ${iraqi} وأجنبي ${foreign}`,
  iraqiOwnership: 'ملكية عراقية',
  foreignOwnership: 'ملكية أجنبية',
  holders: 'مساهم',
  authorisedCapital: 'رأس المال المصرّح',
  depositedCapital: 'المودع لدى المركز',
  depositRatio: 'نسبة الإيداع',
  majorShareholders: 'كبار المساهمين',
  perLatestFiling: 'حسب آخر إفصاح شهري',
  foreign: 'أجنبي',
  iraqi: 'عراقي',

  noFinancialsTitle: 'لم تُستخرج البيانات المالية لهذه الشركة بعد',
  stillAvailableFin: (withOwnership: boolean) =>
    `السعر التاريخي، بيانات الجلسة، القيمة السوقية، الأداء مقابل المؤشر${withOwnership ? '، وبيانات الملكية' : ''}.`,

  crumbsLabel: 'مسار التصفح',
  suspended: 'موقوف عن التداول',
  notTradedSession: 'لم يُتداول في هذه الجلسة',
  noPriorClose: 'لا يوجد إغلاق سابق للمقارنة',
  financials: 'البيانات المالية',
  sectionsLabel: 'أقسام الصفحة',
  priceSection: 'السعر وبيانات الجلسة',
  performance: 'الأداء',
  fundamentals: 'الأساسيات',
  unitGuard: (name: string) =>
    `لم يكتمل توحيد وحدة القياس في البيانات المالية المستخرجة لشركة ${name}، ولذلك لا تُعرض نسب التقييم أو الربحية بدل عرض قيم قد تكون غير صحيحة. التقارير الأصلية المنشورة متاحة في صفحة البيانات المالية.`,
  ownershipSection: 'الملكية والمساهمون',
  noOwnershipTitle: 'لا تتوفر بيانات ملكية لهذه الشركة',
  noOwnershipBody: 'لم تُنشر إيداعات مركز الإيداع لهذه الشركة في آخر تحديث شهري. تُضاف تلقائياً عند توفرها.',
  footnote: 'الأسعار من النشرة الرسمية لبورصة العراق · القيمة السوقية = آخر سعر × الأسهم المصدرة · البيانات المالية مستخرجة من التقارير المنشورة للشركة، وتُعرض كما وردت دون اشتقاق فترات غير مُفصح عنها.',
  suspendedNoCap: (price: string) =>
    `${price} دينار. لا تُحتسب قيمة سوقية للسهم الموقوف، لأنها ستكون سعراً قديماً مضروباً بعدد أسهم حالي.`,
  issuedShares: 'الأسهم المصدرة',
  sessionRailLabel: 'بيانات الجلسة',
  quietNote: 'لم يُتداول السهم في هذه الجلسة. الأرقام أدناه من آخر جلسة تداول فعلية له.',
  open: 'الافتتاح',
  prevClose: 'إغلاق سابق',
  noPriorHint: 'لا يوجد إغلاق سابق قابل للمقارنة',
  tradedValue: 'قيمة التداول',
  trades: 'الصفقات',
  peHint: 'لم تُستخرج بيانات مالية كافية',
  valuation: 'التقييم',
  notPublished: 'غير متوفر في البيانات المنشورة',
  reportPeriod: 'فترة التقرير',
  disclosedOnly: 'تُعرض الفترات المُفصح عنها فقط، دون احتساب أي ربع غير منشور.',
  noReliableCompare: 'لا تتوفر مقارنة موثوقة بالإفصاح السابق',
  noCompareNote: 'لا يتضمّن الإفصاح مقارنة موثوقة بالشهر السابق، ولذلك يظهر عمود التغيّر فارغاً بدل صفر.',

  noShareholdersTitle: 'لم تُنشر قائمة كبار المساهمين',
  noShareholdersBody: 'لا يتضمّن الإفصاح الشهري الأخير كبار مساهمي هذه الشركة.',
  noFinancialsBody: (name: string) =>
    `تُستخرج القوائم المالية من التقارير المنشورة للشركات. لم يُنشر لشركة ${name} تقرير قابل للاستخراج حتى الآن، ولذلك لا تُعرض نسب التقييم أو الربحية — ولا تُعرض أصفاراً بدلاً منها.`,

  notFoundTitle: (sym: string) => `لا يوجد سهم بالرمز ${sym}`,
  notFoundNote: 'تحقّق من الرمز، أو تصفّح الشركات المدرجة في بورصة العراق.',
  allCompanies: 'كل الشركات',
  loadFailed: (sym: string) => `تعذّر تحميل بيانات ${sym}`,
  loadFailedNote: 'يمكن إعادة المحاولة، أو العودة إلى صفحة السوق.',
  retry: 'إعادة المحاولة',

  /* ── The rebuilt page (redesign) ──────────────────────────────────────
     Designed fresh. Most labels above are reused as they are: they are copy,
     already translated, and correct. What is new is the composition and the
     chart's own controls. */
  chart: {
    range: 'المدة',
    ranges: { m1: 'شهر', m3: '3 أشهر', y1: 'سنة', y3: '3 سنوات', all: 'الكل' },
    noSeries: 'لا يتوفر سجل أسعار كافٍ لرسم السهم.',
    chartTools: {
      view: 'نوع الرسم',
      settings: 'إعدادات الرسم',
      candles: 'شموع',
      line: 'خط',
      area: 'مساحة',
      ma: 'المتوسطات',
      maN: (n: string) => `متوسط ${n}`,
      scale: 'المقياس',
      linear: 'خطي',
      log: 'لوغاريتمي',
      reset: 'إعادة الضبط',
      fullscreen: 'ملء الشاشة',
      exitFullscreen: 'إنهاء ملء الشاشة',
      download: 'تنزيل صورة',
      downloaded: 'تم التنزيل',
      volume: 'الحجم',
      zoomHint: 'اسحب للتحريك · مرّر أو اقرص للتكبير · اسحب محور السعر أو التاريخ لتغيير المقياس · نقرة مزدوجة لإعادة الضبط',
      draw: 'الرسم',
      cursor: 'مؤشر',
      trend: 'خط اتجاه',
      hline: 'خط أفقي',
      rect: 'مستطيل',
      fib: 'فيبوناتشي',
      deleteOne: 'حذف المحدد',
      clearAll: 'مسح الرسومات',
      drawHint: 'اسحب على الرسم لإضافة الشكل · اضغط شكلاً لتحديده',
      drawCount: (n: string) => `${n} شكل`,
      o: 'افتتاح', h: 'أعلى', l: 'أدنى', c: 'إغلاق',
    },
  },
  page: {
    eyebrow: 'الأسواق',
    currency: 'دينار',
    periodCol: 'الفترة',
    lede: (name: string) => `سعر سهم ${name} في بورصة العراق: آخر إغلاق وحركته عبر الزمن، ما تملكه الشركة ومن يملكها، وأرقامها المالية كما وردت في تقاريرها المنشورة.`,
    notFound: 'لا توجد شركة بهذا الرمز في سجل بورصة العراق.',
    priceChart: (name: string) => `سعر سهم ${name}`,
    noPrior: 'لا يوجد إغلاق سابق صالح، فالتغيّر غير معلوم.',
    suspended: (d: string) => `موقوف عن التداول · آخر صفقة ${d}`,
    untraded: (d: string) => `لم يتداول في هذه الجلسة · آخر صفقة ${d}`,
    figures: 'أرقام السهم',
    sessionValue: 'قيمة التداول',
    trades: 'عدد الصفقات',
    range52: 'مدى 52 أسبوعاً',
    noFlow: 'لا تتوفر أرقام تداول أجنبي لهذا السهم.',
    noHolders: 'لا يوجد إفصاح عن كبار المساهمين لهذه الشركة في آخر تقرير.',
    holderCols: { holder: 'المساهم', pct: 'نسبة الملكية' },
    about: {
      title: 'عن هذه الأرقام',
      body: [
        'السعر وحجم التداول وعدد الصفقات من النشرة اليومية الرسمية لبورصة العراق، جلسة بجلسة. الرسم يعرض إغلاقات فعلية فقط: كل نقطة جلسة تداول حقيقية، ولا نملأ الفجوات ولا نُنعّم الخط.',
        'القيمة السوقية = آخر سعر × الأسهم المصدرة. السهم الموقوف عن التداول يحمل سعراً قديماً، وقيمته السوقية المحسوبة عليه قديمة بالقدر نفسه — لذلك نذكر تاريخ آخر صفقة بدل الاكتفاء بالرقم.',
        'الأرقام المالية مستخرجة من التقارير المنشورة للشركة وتُعرض كما وردت، دون اشتقاق فترات لم تُفصح عنها الشركة. النسب محسوبة على آخر سنة مالية مكتملة وآخر ربع مُعلن.',
        'الملكية وكبار المساهمين من تقرير مركز الإيداع الشهري، وهي صورة شهرية لا رقم متحرك مع الجلسة. التقرير لا يحمل عمود رمز، فنطابق اسم الشركة مع سجلّ الشركات المدرجة، وما لا يمكن إثباته لا يُعرض.',
      ],
    },
  },
}
