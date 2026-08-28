/**
 * /statistics/foreign-flow — تدفقات المستثمر الأجنبي.
 *
 * ── Three states, never two ───────────────────────────────────────────────
 * A session can have a MEASURED ZERO (foreign buying and selling both nil — a
 * real observation), NO DATA (the bulletin carried no foreign figures for that
 * session), or simply not exist. The page must keep them apart everywhere:
 * `measuredZero` is the sentence that does it, `missingSessions` is its
 * counterpart in the period card, and `chartNetPoints` states the rule for the
 * chart. A no-data session is EXCLUDED from every denominator; it is not zero.
 *
 * ── The cumulative line is not the whole history ──────────────────────────
 * It sums from the start of the SELECTED period, not from the start of the
 * record. `chartCumPoints` says so, in both languages.
 *
 * ── Why the copy is this short ────────────────────────────────────────────
 * Nuance did not get deleted, it got demoted. Anything that is a caveat, a
 * method or a reconciliation rule now lives in a `Note` disclosure or a help
 * tooltip; the main reading path carries labels and numbers only. If a string
 * here grows into a sentence, it belongs in `*Points` or a `*Help` instead.
 */
export const flow = {
  /* ── Page frame ──────────────────────────────────────────────────────── */
  title: 'تدفقات المستثمر الأجنبي',
  standfirst: 'شراء وبيع المستثمرين غير العراقيين في السوق',
  breadcrumb: 'إحصاءات السوق',
  periodGroup: 'الفترة',
  heroLabel: 'ملخص التدفق',

  loadFailed: 'تعذّر تحميل بيانات التدفق الأجنبي',
  failedNote: 'تصل الأرقام مع نشرة التداول اليومية. حدّث الصفحة،',
  backTo: 'أو عد إلى',
  statistics: 'إحصاءات السوق',

  /* ── Hero · session ──────────────────────────────────────────────────── */
  lastSessionChip: 'آخر جلسة مرصودة',
  iqd: 'د.ع',
  netBuy: 'صافي شراء أجنبي',
  netSell: 'صافي بيع أجنبي',
  balanced: 'تدفق متوازن',
  foreignTrades: 'الصفقات',
  companiesActive: 'شركات نشطة',

  /* ── Hero · period ───────────────────────────────────────────────────── */
  periodChip: (label: string) => `الفترة · ${label}`,
  periodOnly: 'الفترة المحددة',
  buying: 'شراء',
  selling: 'بيع',
  buyContinuity: 'استمرارية الشراء',
  buySessionsHelp: 'جلسات الشراء مقسومة على الجلسات المرصودة',
  buySessionsHelpLong: 'الجلسات التي كان صافي التدفق فيها موجباً، مقسومة على الجلسات التي رُصد فيها التدفق فعلاً — لا على جلسات الفترة كلها.',
  sellSessions: 'جلسات بيع',
  grossActivity: 'إجمالي النشاط',
  grossHelp: 'مجموع الشراء والبيع الأجنبي في الفترة',
  grossHelpLong: 'الشراء والبيع مجموعين، لا الصافي. نشاط كبير بصافٍ صغير يعني تبادلاً بين المستثمرين الأجانب أنفسهم.',
  missingSessions: 'بلا بيانات',
  missingHelp: 'جلسات لم تُنشر لها أرقام أجنبية. مستبعدة من كل نسبة على هذه الصفحة، ولا تُحتسب صفراً.',

  /** ⚠ Measured zero is an observation, not an absence. Both halves stay. */
  measuredZero: 'صفر مرصود — لا غياب بيانات.',
  sellBar: (v: string, pct: string) => `بيع ${v} دينار، ${pct} بالمئة`,
  buyBar: (v: string, pct: string) => `شراء ${v} دينار، ${pct} بالمئة`,

  /* ── Chart ───────────────────────────────────────────────────────────── */
  netByPeriod: 'صافي التدفق',
  cumulativeBalance: 'الرصيد التراكمي',
  netEach: 'لكل فترة',
  cumulative: 'تراكمي',
  viewGroup: 'نوع العرض',
  hintNet: 'مرّر أو المس عموداً لتفاصيله',
  hintCum: 'مرّر أو المس نقطة لقراءة الرصيد',
  copyImage: 'نسخ الصورة',
  downloadPng: 'تنزيل PNG',
  copied: 'نُسخت الصورة',
  downloaded: 'تم التنزيل',
  copyFailed: 'تعذّر النسخ · استخدم التنزيل',
  chartNetLabel: (n: string) => `صافي التدفق الأجنبي عبر ${n} فترة`,
  chartCumLabel: (n: string) => `الرصيد التراكمي للتدفق الأجنبي عبر ${n} فترة`,
  chartSource: (from: string, to: string) => `المصدر: نشرة التداول اليومية · ${from} — ${to}`,
  howChart: 'كيف يُقرأ هذا الرسم',
  chartNetPoints: [
    'كل عمود هو صافي تلك الفترة وحدها — لا يُوصَل بين الأعمدة بخط.',
    'خط الصفر يفصل صافي الشراء عن صافي البيع.',
    'الجلسات غير المرصودة تُترك فارغة ولا تُحتسب صفراً.',
  ],
  chartCumPoints: [
    'الخط هو صافي التدفق مجموعاً من بداية الفترة المحددة — لا من بداية السجل.',
    'خط الصفر يفصل الرصيد الموجب عن السالب.',
    'الجلسات غير المرصودة لا تُضيف شيئاً ولا تُحتسب صفراً.',
  ],

  /* ── Chart readout ───────────────────────────────────────────────────── */
  yearOf: (y: string) => `سنة ${y}`,
  weekOf: (from: string, to: string, y: string) => `أسبوع ${from} — ${to} ${y}`,
  observed: 'الرصد',
  cumulativeBalanceRead: 'الرصيد التراكمي',
  periodNet: 'صافي الفترة',
  sessions: 'جلسات',
  noData: 'بلا بيانات',
  net: 'الصافي',
  trades: 'صفقات',
  companies: 'شركات',
  ofActivity: 'من النشاط',
  ofForeignActivity: 'من النشاط الأجنبي',

  /* ── Companies ───────────────────────────────────────────────────────── */
  companyActivity: 'نشاط الشركات',
  rankGroup: 'ترتيب الشركات',
  companyHint: 'مرّر على شركة لأرقامها',
  noCompanies: 'لا شركات على هذا الجانب',
  noCompaniesNote: 'جرّب جانباً آخر أو فترة أطول.',
  companyScope: (ranked: string, total: string) => `${ranked} شركة على هذا الجانب من ${total} شركة بنشاط أجنبي في الفترة`,
  howCompanies: 'كيف تُقرأ هذه الأرقام',
  companyPoints: [
    'مجموع صفوف الشركات يساوي إجمالي الفترة أعلاه — المصدر واحد.',
    'الشركة بلا نشاط على هذا الجانب تغيب عن الترتيب ولا تظهر بصفر.',
    'هذا نشاط تداول، لا تغيّر ملكية.',
  ],
  companyRowLabel: (name: string, buy: string, sell: string, net: string) =>
    `${name}: شراء ${buy}، بيع ${sell}، الصافي ${net}`,

  /* ── Sectors ─────────────────────────────────────────────────────────── */
  capitalSpread: 'توزيع رأس المال الأجنبي',
  bySector: 'حسب القطاع',
  sectorHint: 'مرّر على قطاع لأرقامه',
  noSectorActivity: 'لا نشاط أجنبي في الفترة',
  noSectorNote: 'جرّب فترة أطول.',
  sectorScope: 'مجمّعة من صفوف الشركات نفسها',
  howSectors: 'كيف تُقرأ هذه الأرقام',
  sectorPoints: [
    'الشريط هو إجمالي النشاط (شراء + بيع)، والرقم الملوّن هو الصافي.',
    'نشاط كبير بصافٍ قريب من الصفر يعني تبادلاً بين الأجانب أنفسهم.',
  ],
  sectorRowLabel: (label: string, gross: string, net: string) =>
    `${label}: نشاط ${gross}، الصافي ${net}`,
  unclassified: 'غير مصنّف',

  /* ── Ownership · a different quantity ────────────────────────────────── */
  ownership: 'الملكية الأجنبية',
  ownershipSub: 'ما يملكه الأجانب — لا ما تداولوه',
  monthlySnapshot: (m: string) => `لقطة شهرية · ${m}`,
  fullOwnership: 'هيكل الملكية',
  majorShareholders: 'كبار المساهمين',
  ownershipFailed: 'تعذّر تحميل بيانات الملكية',
  ownershipFailedNote: 'أرقام التدفق أعلاه كاملة — الملكية جدول شهري منفصل.',
  foreignShare: 'حصة الأجانب من الأسهم المودعة',
  shareUnavailable: 'الحصة غير متاحة',
  sharePct: (p: string) => `${p} بالمئة ملكية أجنبية`,
  companiesWithForeign: 'شركات بملكية أجنبية',
  ofInReport: (n: string) => `من ${n}`,
  foreignHolders: 'حاملون أجانب',
  highestForeign: 'أعلى نسبة',
  sharesSplit: (foreign: string, iraqi: string) => `${foreign} سهم أجنبي · ${iraqi} سهم عراقي`,
  ownSource: (month: string) => `المصدر: تقرير الملكية الشهري · ${month}`,
  howOwnership: 'كيف تُقرأ هذه الأرقام',
  ownPoints: [
    'لقطة شهرية، فلا تتبع الفترة المحددة أعلى الصفحة.',
    'النسبة = الأسهم الأجنبية ÷ مجموع الأسهم المودعة لشركات الشهر.',
    'الأسماء مستخرجة من تقرير ممسوح ضوئياً وتُطابَق بالسجل المعتمد عند العرض.',
  ],

  /* ── Grain and ranking ───────────────────────────────────────────────── */
  grain: {
    session: 'كل عمود جلسة',
    week: 'كل عمود أسبوع',
    month: 'كل عمود شهر',
    year: 'كل عمود سنة',
  },
  rank: {
    netIn: 'أكبر صافي شراء',
    netOut: 'أكبر صافي بيع',
    buy: 'أكبر شراء',
    sell: 'أكبر بيع',
  },
}
