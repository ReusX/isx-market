/**
 * /c/[sym]/financials.
 *
 * ── What this route refuses to do ─────────────────────────────────────────
 * It prints the periods the company DISCLOSED, exactly as reported, and
 * derives nothing: no Q4 inferred by subtracting three quarters from the year,
 * no trailing-twelve-month figure assembled from parts, no quarter duration
 * the filing did not state. The column labels are period CODES for that
 * reason. Every one of those refusals has a sentence on the page, and each
 * survives translation intact.
 *
 * ── The unit guard ────────────────────────────────────────────────────────
 * A handful of companies have extractions whose unit of measure could not be
 * reconciled. Their ratios are WITHHELD rather than shown at values that might
 * be off by a factor of a thousand — and the page says so, and links to the
 * original filings.
 */
export const financials = {
  ttm: 'TTM (آخر 12 شهراً)',
  fiscalYear: (y: string) => `السنة المالية ${y}`,
  companies: 'الشركات',
  title: 'البيانات المالية',
  templateBank: 'نموذج مصرفي',
  templateIndustrial: 'نموذج صناعي/خدمي',
  overview: 'نظرة عامة',

  loadFailed: 'تعذّر تحميل القوائم المالية',
  loadFailedNote: 'يمكن إعادة المحاولة، أو العودة إلى صفحة الشركة.',
  retry: 'إعادة المحاولة',

  tabStatements: 'نظرة عامة',
  tabRatios: 'النسب المالية',
  annual: 'سنوي',
  quarterly: 'ربعي',

  noAnnual: 'لا تتوفر قوائم سنوية لهذه الشركة',
  noAnnualNote: 'الفترات المستخرجة لهذه الشركة ربعية فقط. اختر «ربعي» داخل أي قائمة لعرضها.',

  operatingIncome: 'الدخل التشغيلي',
  revenue: 'الإيرادات',
  netProfit: 'صافي الربح',
  totalAssets: 'إجمالي الأصول',
  totalEquity: 'حقوق الملكية',
  incomeBank: 'الدخل التشغيلي والأرباح',
  incomeCorp: 'الإيرادات والأرباح',
  valuesIn: 'القيم بـ',
  latestYear: 'آخر سنة مالية',
  redBarsAreLosses: 'الأعمدة الحمراء خسائر',

  notPublished: 'لم تُنشر هذه القائمة لهذه الشركة',
  valuesArePct: 'القيم بالنسبة المئوية',
  item: 'البند',
  reportLink: (col: string) => `تقرير ${col} — يفتح ملف PDF على موقع هيئة الأوراق المالية`,
  sourceLabel: (src: string) => `المسمى في المصدر: ${src}`,
  conflictingValues: 'وردت قيمتان مختلفتان لهذا البند في الاستخراج، ولم يمكن ترجيح إحداهما',
  notInReport: 'غير متوفر في التقرير',
  asDisclosed: 'كل عمود فترة مُفصح عنها كما وردت، دون احتساب أو اشتقاق.',

  noRatios: 'لا تتوفر نسب مالية محتسبة لهذه الشركة',
  noRatiosNote: 'تُحتسب النسب من القوائم المستخرجة، ولم تتوفر بنود كافية لاحتسابها.',
  ratios: 'النسب المالية',
  fromAnnual: 'محتسبة من القوائم السنوية',
  ratio: 'النسبة',
  trend: 'الاتجاه',

  source: 'المصدر',
  sourceValue: 'التقارير المنشورة · هيئة الأوراق المالية العراقية',
  latestDisclosed: 'آخر فترة مُفصح عنها',
  periodsShown: 'الفترات المعروضة',
  reportedUnit: 'الوحدة في التقرير',
  currency: 'العملة',
  currencyValue: 'الدينار العراقي (IQD)',
  conflicts: (n: string) => ` وردت ${n} قيمة متعارضة في الاستخراج لهذه الشركة، وتظهر خاناتها فارغة.`,

  withheldTitle: 'القوائم المالية لهذه الشركة غير معروضة حالياً',
  stillAvailable: 'ما يزال متوفراً',
  backToCompany: 'العودة إلى صفحة الشركة',
  originalReports: 'التقارير الأصلية',
  asPublished: 'كما نُشرت لدى هيئة الأوراق المالية',
  reportedUnitIs: (u: string) => `الوحدة في التقرير: ${u}`,

  crumbsLabel: 'مسار التصفح',
  backToOverview: 'العودة إلى نظرة عامة',
  tabsLabel: 'أقسام البيانات المالية',
  periodGroup: 'فترة التقرير',
  periodPolicy: 'تُعرض الفترات كما وردت في الإفصاح، برمز الفترة وسنتها. لا تحدّد البيانات المتاحة المدة التي يغطيها كل تقرير ربعي، ولذلك لا تُجمع الأعمدة الربعية ولا تُقارن بالسنوي.',
  overviewLabel: 'نظرة عامة على الأداء المالي',
  noPriorYear: 'لا توجد سنة سابقة للمقارنة',
  yoyNote: (name: string) => `مقارنة سنوية بين آخر سنتين ماليتين مُفصح عنهما لشركة ${name}.`,
  statementMissing: (label: string) => `لا تتضمّن التقارير المستخرجة لهذه الشركة ${label} في أي من الفترات المتاحة.`,
  othersNormal: 'باقي القوائم والنسب معروضة كالمعتاد.',
  spanLabel: (label: string, from: string, to: string) => `${label} — ${from} إلى ${to}`,
  ratiosLabel: 'النسب المالية',
  footnote1: 'القيم معروضة بالدينار بعد توحيد وحدة التقرير، والوحدة كما وردت في كل إفصاح مذكورة أعلاه. تُعرض كل فترة كما وردت في إفصاحها، ولا تُشتق فترات غير منشورة ولا تُجمع الأعمدة الربعية. قد تختلف تسمية البنود عن التقرير الأصلي — التسمية الأصلية متاحة على البند حيث توفرت.',
  footnote2: ' الأرقام لأغراض معلوماتية ولا تُغني عن التقرير الأصلي.',
  withheldBody: (name: string) =>
    `تُعرض القوائم بعد توحيد وحدة القياس الواردة في كل إفصاح. لم يكتمل توحيد الوحدة في البيانات المستخرجة لشركة ${name}، ولذلك لا تُعرض الأرقام بدل عرض قيم قد تكون غير صحيحة بمقدار ألف ضعف. لا يتعلق ذلك بالتقارير التي نشرتها الشركة — وهي متاحة أدناه كما هي.`,
  withheldStill: 'التقارير الأصلية المنشورة، والسعر التاريخي وبيانات الجلسة والقيمة السوقية والأداء مقابل المؤشر في صفحة الشركة.',
  originalReportsLabel: 'التقارير الأصلية',
  noneBody: (name: string) =>
    `تُستخرج القوائم المالية من التقارير المنشورة لدى هيئة الأوراق المالية العراقية. لم يُنشر لشركة ${name} تقرير قابل للاستخراج حتى الآن.`,

  noneTitle: 'لم تُنشر بيانات مالية لهذه الشركة بعد',
  noneNote: 'السعر التاريخي، بيانات الجلسة، القيمة السوقية، والأداء مقابل المؤشر في صفحة الشركة.',
}
