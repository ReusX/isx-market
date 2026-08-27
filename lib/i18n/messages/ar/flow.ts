/**
 * /statistics/foreign-flow — تدفقات المستثمر الأجنبي.
 *
 * ── Three states, never two ───────────────────────────────────────────────
 * A session can have a MEASURED ZERO (foreign buying and selling both nil — a
 * real observation), NO DATA (the bulletin carried no foreign figures for that
 * session), or simply not exist. The page must keep them apart everywhere:
 * «لا نشاط أجنبي — شراء وبيع كلاهما صفر، وليس غياب بيانات» is the sentence
 * that does it, and «جلسة بلا بيانات لم تُحتسب» is its counterpart. A
 * no-data session is EXCLUDED from every denominator; it is not a zero.
 *
 * ── The cumulative line is not the whole history ──────────────────────────
 * It sums from the start of the SELECTED period, not from the start of the
 * record. The chart note says so, in both languages.
 */
export const flow = {
  title: 'تدفقات المستثمر الأجنبي',
  sessionsInPeriod: (n: string) => `${n} جلسة في الفترة`,
  lastObserved: (d: string) => `آخر جلسة برصد ${d}`,

  loadFailed: 'تعذّر تحميل بيانات التدفق الأجنبي',
  backTo: 'أو عد إلى',
  statistics: 'إحصاءات السوق',

  lastSessionChip: 'آخر جلسة برصد',
  iqd: 'د.ع',
  netBuy: 'صافي شراء أجنبي',
  netSell: 'صافي بيع أجنبي',
  balanced: 'تدفق متوازن',
  foreignTrades: 'صفقات أجنبية',
  companiesActive: 'شركات بنشاط أجنبي',

  periodChip: (label: string) => `الفترة المحددة · ${label}`,
  periodOnly: 'الفترة المحددة',
  cumulativeLine: (dir: string, counted: string, buy: string, sell: string, missing: string) =>
    `صافي ${dir} تراكمي على مدى ${counted} جلسة برصد · ${buy} جلسة شراء مقابل ${sell} جلسة بيع`
    + (missing ? ` · ${missing} جلسة بلا بيانات لم تُحتسب` : ''),
  buying: 'شراء',
  selling: 'بيع',
  buySessionsHelp: 'جلسات الشراء مقسومة على الجلسات المرصودة',
  grossHelp: 'مجموع الشراء والبيع الأجنبي في الفترة',

  netByPeriod: 'صافي التدفق عبر الفترات',
  cumulativeBalance: 'الرصيد التراكمي خلال الفترة',
  netEach: 'صافي كل فترة',
  cumulative: 'التراكمي',
  netNote: 'أعمدة منفصلة من خط صفر مشترك — كل عمود هو ما حدث خلال تلك الفترة وحدها. لا يُوصَل بينها بخط، لأن الخط يفترض قيماً بين الفترات لم تُرصد.',
  cumNote: 'خط متصل لأن الرصيد التراكمي كمية مستمرة: صافي التدفق مجموعاً من بداية الفترة المحددة — لا من بداية السجل.',

  companyActivity: 'نشاط الشركات',
  noCompanies: 'لا توجد شركات بنشاط أجنبي على هذا الجانب',
  noCompaniesNote: 'جرّب جانباً آخر أو فترة أطول.',
  companyHint: 'مرّر على شركة لقراءة أرقامها · النقر يفتح صفحتها',

  capitalSpread: 'توزيع رأس المال الأجنبي',
  bySector: 'حسب القطاع',
  noSectorActivity: 'لا نشاط أجنبي في الفترة',
  noSectorNote: 'جرّب فترة أطول.',
  sectorHint: 'مرّر أو انقر على قطاع لعرض أرقامه',

  ownership: 'الملكية الأجنبية',
  monthlySnapshot: (m: string) => `لقطة شهرية · ${m}`,
  fullOwnership: 'هيكل الملكية الكامل',
  majorShareholders: 'كبار المساهمين',
  ownershipFailed: 'تعذّر تحميل بيانات الملكية',
  ownershipFailedNote: 'أرقام التدفق والنشاط أعلاه محدّثة وكاملة — الملكية جدول شهري منفصل.',
  foreignShare: 'حصة الأجانب من الأسهم المودعة',
  shareUnavailable: 'الحصة غير متاحة',
  sharePct: (p: string) => `${p} بالمئة ملكية أجنبية`,
  companiesWithForeign: 'شركات بملكية أجنبية',
  ofInReport: (n: string) => `من ${n} في تقرير الشهر`,
  foreignHolders: 'حاملون أجانب',
  highestForeign: 'أعلى نسبة ملكية أجنبية',

  /** ⚠ The measured-zero sentence. Never shorten it. */
  measuredZero: 'لا نشاط أجنبي — شراء وبيع كلاهما صفر، وليس غياب بيانات.',
  ofActivity: 'من النشاط',
  ofForeignActivity: 'من النشاط الأجنبي',
  net: 'الصافي',
  trades: 'صفقات',
  companies: 'شركات',
  buyOf:  (v: string, pct: string) => `${v} شراء · ${pct} من النشاط`,
  sellOf: (v: string, pct: string) => `${v} بيع · ${pct} من النشاط`,
  bothOf: (b: string, s: string) => `${b} شراء · ${s} بيع`,

  /* Chart */
  yearOf:  (y: string) => `سنة ${y}`,
  weekOf:  (from: string, to: string, y: string) => `أسبوع ${from} — ${to} ${y}`,
  observed: 'الرصد',
  cumulativeBalanceRead: 'الرصيد التراكمي',
  periodNet: 'صافي الفترة',
  sessions: 'جلسات',
  noData: 'بلا بيانات',
  hintNet: 'مرّر أو انقر على عمود لقراءة الشراء والبيع والصافي',
  hintCum: 'مرّر أو انقر لقراءة الرصيد التراكمي عند ذلك التاريخ',
  copyImage: 'نسخ الصورة',
  downloadPng: 'تنزيل PNG',
  copied: 'نُسخت الصورة',
  downloaded: 'تم التنزيل',
  copyFailed: 'تعذّر النسخ · استخدم التنزيل',
  chartNetLabel: (n: string) => `صافي التدفق الأجنبي عبر ${n} فترة`,
  chartCumLabel: (n: string) => `الرصيد التراكمي للتدفق الأجنبي عبر ${n} فترة`,


  breadcrumb: 'إحصاءات السوق',
  standfirst: 'شراء وبيع غير العراقيين لكل شركة، من نشرة التداول اليومية',
  periodGroup: 'الفترة',
  failedNote: 'تُنشر أرقام التدفق الأجنبي مع نشرة التداول اليومية. حاول تحديث الصفحة،',
  heroLabel: 'ملخص التدفق',
  buyContinuity: 'استمرارية الشراء',
  buySessionsHelpLong: 'عدد الجلسات التي كان صافي التدفق فيها موجباً، مقسوماً على عدد الجلسات التي رُصد فيها التدفق فعلاً — لا على جلسات الفترة كلها. النسبة والعددان معروضان معاً.',
  grossActivity: 'إجمالي النشاط',
  grossHelpLong: 'مجموع الشراء والبيع الأجنبي في الفترة — الإجمالي وليس الصافي. نشاط كبير بصافٍ صغير يعني تبادلاً بين المستثمرين الأجانب أنفسهم.',
  viewGroup: 'نوع العرض',
  rankGroup: 'ترتيب الشركات',
  sourceLine: (from: string, to: string) =>
    ` المصدر: foreign_flow_company_daily · ${from} — ${to}. الجلسات التي لا يوجد لها رصد لا تُرسم ولا تُحتسب صفراً.`,
  companyFoot: (ranked: string, total: string) =>
    `${ranked} شركة على هذا الجانب، من أصل ${total} شركة بنشاط أجنبي في الفترة. الشركات التي لا نشاط لها على هذا الجانب غائبة عن الترتيب ولا تظهر بصفر. مجموع صفوف الشركات يساوي إجمالي الفترة أعلاه بالدينار — الصفوف والإجمالي من الجدول نفسه. هذا نشاط تداول ولا يعني تغيّراً في الملكية.`,
  sectorFoot: 'الشريط يقيس إجمالي النشاط (شراء + بيع)، والرقم الملوّن هو الصافي. قطاع بنشاط كبير وصافٍ قريب من الصفر يعني تبادلاً بين المستثمرين الأجانب أنفسهم، لا دخولاً أو خروجاً. القطاعات مجمّعة من صفوف الشركات نفسها، لا من الجدول الشهري.',
  ownershipNote: 'الملكية ليست تدفقاً. الأرقام أعلاه تقيس ما تداوله الأجانب خلال الفترة، وهذه الأرقام تقيس ما يملكونه فعلاً من الأسهم المودعة في تاريخ واحد. شهرٌ من الشراء الكثيف قد لا يحرّك الملكية إذا جرى بين الأجانب أنفسهم.',
  sharesSplit: (foreign: string, iraqi: string) => `${foreign} سهماً أجنبياً مقابل ${iraqi} سهماً عراقياً`,
  ownershipSource: (month: string) =>
    `المصدر: ownership_monthly · ${month}. تُحدَّث شهرياً مع التقرير الرسمي، ولذلك لا تتبع الفترة المحددة أعلى الصفحة. النسبة = الأسهم الأجنبية ÷ (الأسهم الأجنبية + العراقية) مجموعةً على شركات الشهر. أسماء الشركات في هذا الجدول مستخرجة من تقرير ممسوح ضوئياً وتُطابَق بالسجل المعتمد عند العرض.`,
  sellBar: (v: string, pct: string) => `بيع ${v} دينار، ${pct} بالمئة`,
  buyBar:  (v: string, pct: string) => `شراء ${v} دينار، ${pct} بالمئة`,
  unclassified: 'غير مصنّف',

  /* Grain and ranking definitions */
  companyRowLabel: (name: string, buy: string, sell: string, net: string) =>
    `${name}: شراء ${buy}، بيع ${sell}، الصافي ${net}`,
  sectorRowLabel: (label: string, gross: string, net: string) =>
    `${label}: نشاط ${gross}، الصافي ${net}`,

  grain: {
    session: 'يومي · كل عمود جلسة',
    week:    'أسبوعي · كل عمود مجموع أسبوع',
    month:   'شهري · كل عمود مجموع شهر',
    year:    'سنوي · كل عمود مجموع سنة',
  },
  rank: {
    netIn:  'أكبر صافي شراء',
    netOut: 'أكبر صافي بيع',
    buy:    'أكبر شراء',
    sell:   'أكبر بيع',
  },
}
