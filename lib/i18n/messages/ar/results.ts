/**
 * Company results — a filing written out. Same discipline as the session
 * wrap: numbers arrive formatted, this file chooses the words, variants are
 * picked by the filing so a page is stable across renders.
 */
type Dir = 'up' | 'down' | 'flat'
type Money = { text: string }
type Cmp = { pct: string; dir: Dir } | null
export type ResultsVars = {
  company: string; sym: string; periodLabel: string; year: string; isAnnual: boolean; isBank: boolean
  net: string; netDir: Dir; netYoY: Cmp
  revenue: string | null; revenueYoY: Cmp
  pretax: string | null
  assets: string | null; assetsYoY: Cmp
  equity: string | null
  deposits: string | null; depositsYoY: Cmp
  financing: string | null
  roe: string | null; roa: string | null; eps: string | null; margin: string | null; car: string | null; ltd: string | null; npl: string | null
  filedOn: string | null
  seed: string
}
const pick = <T,>(arr: T[], seed: string) => arr[Array.from(seed).reduce((t, c) => t + c.charCodeAt(0), 0) % arr.length]
const yoy = (c: Cmp, up: string, down: string, flat: string) => (!c ? '' : c.dir === 'up' ? `${up} ${c.pct}%` : c.dir === 'down' ? `${down} ${c.pct}%` : flat)

export const results = {
  eyebrow: 'نتائج الشركات',
  h1: (v: ResultsVars) => `نتائج ${v.company} ${v.isAnnual ? `للسنة المالية ${v.year}` : `${v.periodLabel} ${v.year}`}`,
  seoTitle: (v: ResultsVars) => `نتائج ${v.company} ${v.isAnnual ? v.year : `${v.periodLabel} ${v.year}`} · ${v.netDir === 'down' && v.net.startsWith('−') ? 'خسارة' : 'صافي ربح'} ${v.net.replace('−', '')} دينار${v.netYoY ? ` (${v.netYoY.dir === 'up' ? '+' : v.netYoY.dir === 'down' ? '−' : ''}${v.netYoY.pct}%)` : ''}`,
  seoDescription: (v: ResultsVars) => `${v.company} (${v.sym}) ${v.isAnnual ? `في السنة المالية ${v.year}` : `في ${v.periodLabel} ${v.year}`}: صافي الربح ${v.net} دينار${v.netYoY ? ` ${yoy(v.netYoY, 'بارتفاع', 'بتراجع', 'دون تغيّر')} عن العام السابق` : ''}${v.revenue ? `، الإيرادات ${v.revenue}` : ''}${v.assets ? `، إجمالي الأصول ${v.assets}` : ''}${v.roe ? `، العائد على حقوق الملكية ${v.roe}%` : ''}. من القوائم المالية المودعة لدى هيئة الأوراق المالية.`,
  standfirst: 'مكتوبة تلقائياً من القوائم المالية التي أودعتها الشركة لدى هيئة الأوراق المالية العراقية، بعد استخراج الأرقام وتوحيد وحداتها. الأرقام كما وردت في القوائم؛ لا رأي هنا ولا توصية.',

  headline: (v: ResultsVars) => {
    const when = v.isAnnual ? `السنة المالية ${v.year}` : `${v.periodLabel} من ${v.year}`
    const vs = v.isAnnual ? 'العام السابق' : 'الفترة نفسها من العام السابق'
    const loss = v.net.startsWith('−')
    if (loss) return `سجّلت ${v.company} خسارة صافية قدرها ${v.net.replace('−', '')} دينار في ${when}${v.netYoY ? `، مقارنة بـ${yoy(v.netYoY, 'تحسّن', 'تراجع', 'نتيجة مماثلة')} عن ${vs}` : ''}.`
    return pick([
      `حقّقت ${v.company} صافي ربح قدره ${v.net} دينار في ${when}${v.netYoY ? `، ${yoy(v.netYoY, 'بارتفاع', 'بتراجع', 'دون تغيّر يُذكر')} عن ${vs}` : ''}.`,
      `بلغ صافي ربح ${v.company} في ${when} ما مقداره ${v.net} دينار${v.netYoY ? `، وهو ${yoy(v.netYoY, 'أعلى بنسبة', 'أدنى بنسبة', 'في مستوى ما كان عليه')}${v.netYoY.dir === 'flat' ? '' : ' مما كان عليه'} في ${v.isAnnual ? 'العام السابق' : 'الفترة المقابلة من العام السابق'}` : ''}.`,
    ], v.seed)
  },
  revenue: (v: ResultsVars) => {
    if (!v.revenue) return ''
    const label = v.isBank ? 'صافي إيرادات العمولات والأعمال المصرفية' : 'الإيرادات'
    return `${pick([`بلغت ${label} ${v.revenue} دينار`, `وسجّلت الشركة ${label.replace('الإيرادات', 'إيرادات')} بقيمة ${v.revenue} دينار`], v.seed + 'r')}${v.revenueYoY ? `، ${yoy(v.revenueYoY, 'بزيادة', 'بانخفاض', 'دون تغيّر')} على أساس سنوي` : ''}${v.pretax ? `، وبلغ الربح قبل الضريبة ${v.pretax} دينار` : ''}${v.margin ? `. هامش صافي الربح ${v.margin}%` : ''}.`
  },
  balance: (v: ResultsVars) => {
    const parts: string[] = []
    if (v.assets) parts.push(`إجمالي الأصول ${v.assets} دينار${v.assetsYoY ? ` (${yoy(v.assetsYoY, '+', '−', '=').replace(' ', '')} على أساس سنوي)` : ''}`)
    if (v.equity) parts.push(`حقوق الملكية ${v.equity} دينار`)
    if (v.isBank && v.deposits) parts.push(`ودائع العملاء ${v.deposits} دينار${v.depositsYoY ? ` (${yoy(v.depositsYoY, '+', '−', '=').replace(' ', '')})` : ''}`)
    if (v.isBank && v.financing) parts.push(`ومحفظة التمويل ${v.financing} دينار`)
    return parts.length ? `في الميزانية: ${parts.join('، ')}.` : ''
  },
  ratios: (v: ResultsVars) => {
    const parts: string[] = []
    if (v.roe) parts.push(`العائد على حقوق الملكية ${v.roe}%`)
    if (v.roa) parts.push(`العائد على الأصول ${v.roa}%`)
    if (v.eps) parts.push(`ربحية السهم ${v.eps} دينار`)
    if (v.car) parts.push(`كفاية رأس المال ${v.car}%`)
    if (v.ltd) parts.push(`نسبة التمويل إلى الودائع ${v.ltd}%`)
    if (v.npl) parts.push(`نسبة التسهيلات المتعثرة ${v.npl}%`)
    return parts.length ? `من المؤشرات المشتقة: ${parts.join('، ')}.` : ''
  },
  source: (v: ResultsVars) => v.filedOn ? `أودعت الشركة هذه القوائم لدى هيئة الأوراق المالية بتاريخ ${v.filedOn}.` : 'مصدر الأرقام القوائم المالية المودعة لدى هيئة الأوراق المالية.',

  sections: { headline: 'النتيجة', income: 'الدخل', balance: 'الميزانية', ratios: 'المؤشرات', table: 'الأرقام الرئيسية', filings: 'قوائم أخرى للشركة' },
  cols: { line: 'البند', now: 'الفترة', prior: 'الفترة المقابلة', change: 'التغيّر' },
  lines: { net_income: 'صافي الربح', pretax_income: 'الربح قبل الضريبة', revenue: 'الإيرادات', revenue_bank: 'صافي إيرادات العمولات والأعمال المصرفية', operating_income: 'الربح التشغيلي', total_assets: 'إجمالي الأصول', total_equity: 'حقوق الملكية', customer_deposits: 'ودائع العملاء', islamic_financing: 'محفظة التمويل', cash: 'النقد', paid_capital: 'رأس المال المدفوع' },
  pdf: 'القوائم المالية الأصلية (PDF)',
  allFinancials: 'كل القوائم المالية للشركة',
  companyPage: 'صفحة السهم',
  aboutTitle: 'كيف تُكتب هذه الصفحة',
  aboutBody: 'تُستخرج الأرقام من القوائم المالية الممسوحة التي تودعها الشركة لدى هيئة الأوراق المالية، وتُوحَّد وحداتها إلى الدينار، ثم تُكتب هذه الصفحة منها تلقائياً. المقارنة السنوية تكون مع الفترة نفسها من العام السابق حين تتوفر. الشركات التي في أرقامها عيب معروف في التوحيد لا تُنشر لها صفحة نتائج. تبقى القوائم الأصلية هي المرجع.',
  unitBn: 'مليار', unitMn: 'مليون', unitK: 'ألف', unitTn: 'تريليون',
  kindLabel: 'نتائج',
  feedHeadline: (v: ResultsVars) => `نتائج ${v.company} ${v.isAnnual ? v.year : `${v.periodLabel} ${v.year}`}: صافي ربح ${v.net} دينار${v.netYoY ? ` (${v.netYoY.dir === 'up' ? '+' : v.netYoY.dir === 'down' ? '−' : ''}${v.netYoY.pct}%)` : ''}`,
  sourceName: 'IQWealth · من القوائم المالية',
  yoyNote: 'مقارنة بالفترة نفسها من العام السابق',
}
