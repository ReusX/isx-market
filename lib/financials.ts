/**
 * The model behind `/c/[sym]/financials`.
 *
 * The statement templates, the ratio dictionary and the unit arithmetic below
 * are the approved reference's, copied. What is this application's is the
 * period policy, and it is deliberately more cautious than either the
 * reference or the module that predates it.
 *
 * ── Period labels are neutral ─────────────────────────────────────────────
 * The reference renames quarters by the span it assumes they cover — Q2 to
 * «النصف الأول», Q3 to «التسعة أشهر». Nothing in this database establishes
 * that. `financial_facts_public` carries a period CODE and no duration, and
 * `financial_reports_public` carries no period wording either, so a duration
 * label here would be an inference dressed as provenance. Columns are named
 * «Q1 2025» and «سنوي 2025» and nothing more. If the pipeline later stores the
 * filing's own wording, that wording — not the quarter number — is what should
 * appear beneath the neutral label.
 *
 * ── Nothing is derived ────────────────────────────────────────────────────
 * No standalone quarter is computed from a cumulative filing, and Q1+Q2+Q3+Q4
 * is not used as a validation rule: both assume a duration the source does not
 * establish. Cells are as filed or absent.
 *
 * ── Q4 and ANNUAL are separate filings, always ────────────────────────────
 * Checked rather than assumed: 20 ticker-years carry both, and in every one of
 * them the two point at DIFFERENT documents in `financial_reports_public`.
 * There is not a single case of one document filed under two period codes. So
 * both are kept as separate as-filed columns even where their values coincide,
 * and neither is dropped to make the other look consistent.
 *
 * ── Two filings for one period ────────────────────────────────────────────
 * 35 cells of 4,758 hold two different values for the same ticker, year,
 * period and line. `financial_reports_public` has exactly one document per
 * period, so these are a double extraction rather than two filings — and 28 of
 * them are separable, because the report records the unit the filing declared
 * and only one of the two rows matches it. Those resolve to the matching row.
 * The remaining 7, all BEFI 2025 Q1, agree on the unit and disagree on the
 * number; they render as unavailable, because choosing one would be a guess.
 */

/* ── Types ─────────────────────────────────────────────────────────────── */

export type StatementId = 'income' | 'balance' | 'cashflow' | 'metrics'
export type PeriodMode = 'ANNUAL' | 'QUARTER'
export type Period = 'ANNUAL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'
export type Col = { y: number; p: Period }

export type Line = {
  key: string
  ar: string
  /** Nesting depth. 0 = top level, 1 = component of the line above it. */
  depth: 0 | 1
  /** A summed line: heavier, ruled above. */
  subtotal?: boolean
  /** The statement's bottom line: heaviest, ruled top and bottom. */
  total?: boolean
}

export const TEMPLATES: Record<"industrial" | "bank", Partial<Record<StatementId, { label: string; lines: Line[] }>>> = {
  industrial: {
    income: {
      label: "قائمة الدخل",
      lines: [
        { key: "revenue", ar: "الإيرادات", depth: 0 },
        { key: "salaries_wages", ar: "الرواتب والأجور", depth: 1 },
        { key: "goods_supplies", ar: "المستلزمات السلعية", depth: 1 },
        { key: "service_supplies", ar: "المستلزمات الخدمية", depth: 1 },
        { key: "contracts_services", ar: "خدمات العقود", depth: 1 },
        { key: "purchases_opex", ar: "مشتريات ومصاريف تشغيلية", depth: 1 },
        { key: "interest_expense", ar: "مصروفات الفوائد", depth: 1 },
        { key: "depreciation_amortization", ar: "الاندثار والإطفاء", depth: 1 },
        { key: "taxes_fees", ar: "الضرائب والرسوم", depth: 1 },
        { key: "total_operating_expenses", ar: "إجمالي المصروفات التشغيلية", depth: 0, subtotal: true },
        { key: "operating_income", ar: "الربح التشغيلي", depth: 0, subtotal: true },
        { key: "other_income", ar: "إيرادات أخرى", depth: 1 },
        { key: "other_expenses", ar: "مصروفات أخرى", depth: 1 },
        { key: "pretax_income", ar: "الربح قبل الضريبة", depth: 0, subtotal: true },
        { key: "tax", ar: "ضريبة الدخل", depth: 1 },
        { key: "net_income", ar: "صافي الربح", depth: 0, total: true },
      ],
    },
    balance: {
      label: "المركز المالي",
      lines: [
        { key: "net_fixed_assets", ar: "الأصول الثابتة (صافي)", depth: 1 },
        { key: "deferred_revenue_expenses", ar: "النفقات الإيرادية المؤجلة", depth: 1 },
        { key: "projects_under_construction", ar: "مشاريع تحت التنفيذ", depth: 1 },
        { key: "total_fixed_assets", ar: "إجمالي الأصول الثابتة", depth: 0, subtotal: true },
        { key: "inventory", ar: "المخزون", depth: 1 },
        { key: "investments", ar: "الاستثمارات", depth: 1 },
        { key: "receivables", ar: "الذمم المدينة", depth: 1 },
        { key: "cash", ar: "النقد", depth: 1 },
        { key: "total_current_assets", ar: "إجمالي الأصول المتداولة", depth: 0, subtotal: true },
        { key: "total_assets", ar: "إجمالي الأصول", depth: 0, total: true },
        { key: "paid_capital", ar: "رأس المال المدفوع", depth: 1 },
        { key: "reserves", ar: "الاحتياطيات", depth: 1 },
        { key: "retained_earnings", ar: "الأرباح المحتجزة", depth: 1 },
        { key: "total_equity", ar: "إجمالي حقوق الملكية", depth: 0, subtotal: true },
        { key: "long_term_provisions", ar: "مخصصات طويلة الأجل", depth: 1 },
        { key: "long_term_payables", ar: "ذمم دائنة طويلة الأجل", depth: 1 },
        { key: "short_term_provisions", ar: "مخصصات قصيرة الأجل", depth: 1 },
        { key: "short_term_payables", ar: "ذمم دائنة قصيرة الأجل", depth: 1 },
        { key: "total_equity_and_liabilities", ar: "إجمالي حقوق الملكية والمطلوبات", depth: 0, total: true },
      ],
    },
    cashflow: {
      label: "التدفقات النقدية",
      lines: [
        { key: "cfo", ar: "التدفق النقدي من الأنشطة التشغيلية", depth: 0, subtotal: true },
        { key: "capex", ar: "النفقات الرأسمالية", depth: 1 },
        { key: "cfi", ar: "التدفق النقدي من الأنشطة الاستثمارية", depth: 0, subtotal: true },
        { key: "dividends_paid", ar: "توزيعات الأرباح المدفوعة", depth: 1 },
        { key: "cff", ar: "التدفق النقدي من الأنشطة التمويلية", depth: 0, subtotal: true },
        { key: "net_change_in_cash", ar: "صافي التغير في النقد", depth: 0, total: true },
        { key: "cash_beginning", ar: "النقد في بداية الفترة", depth: 1 },
        { key: "cash_ending", ar: "النقد في نهاية الفترة", depth: 0, subtotal: true },
      ],
    },
  },
  bank: {
    income: {
      label: "قائمة الدخل",
      lines: [
        { key: "financing_income", ar: "صافي إيرادات الفوائد والتمويل", depth: 0 },
        { key: "revenue_and_commissions", ar: "صافي إيرادات العمولات والأعمال المصرفية", depth: 0 },
        { key: "ga_expenses", ar: "المصروفات العمومية والإدارية", depth: 1 },
        { key: "pretax_income", ar: "الربح قبل الضريبة", depth: 0, subtotal: true },
        { key: "tax", ar: "ضريبة الدخل", depth: 1 },
        { key: "net_income", ar: "صافي الربح", depth: 0, total: true },
      ],
    },
    balance: {
      label: "المركز المالي",
      lines: [
        { key: "cash_and_cbi", ar: "النقد والأرصدة لدى البنك المركزي", depth: 1 },
        { key: "due_from_banks", ar: "الأرصدة لدى المصارف", depth: 1 },
        { key: "islamic_financing", ar: "صافي التسهيلات الائتمانية والتمويل", depth: 1 },
        { key: "investments", ar: "الاستثمارات", depth: 1 },
        { key: "fixed_assets", ar: "الأصول الثابتة", depth: 1 },
        { key: "total_assets", ar: "إجمالي الأصول", depth: 0, total: true },
        { key: "customer_deposits", ar: "ودائع العملاء", depth: 1 },
        { key: "due_to_banks", ar: "المستحق للمصارف", depth: 1 },
        { key: "other_liabilities", ar: "مطلوبات أخرى", depth: 1 },
        { key: "paid_capital", ar: "رأس المال المدفوع", depth: 1 },
        { key: "reserves", ar: "الاحتياطيات", depth: 1 },
        { key: "retained_earnings", ar: "الأرباح المحتجزة", depth: 1 },
        { key: "total_equity", ar: "إجمالي حقوق الملكية", depth: 0, subtotal: true },
        { key: "total_liabilities_and_equity", ar: "إجمالي المطلوبات وحقوق الملكية", depth: 0, total: true },
      ],
    },
    metrics: {
      label: "المؤشرات المصرفية",
      lines: [
        { key: "capital_adequacy_ratio", ar: "كفاية رأس المال", depth: 0 },
        { key: "lcr", ar: "نسبة تغطية السيولة", depth: 0 },
        { key: "nsfr", ar: "صافي التمويل المستقر", depth: 0 },
        { key: "npl_ratio", ar: "نسبة التعثر", depth: 0 },
      ],
    },
  },
};

/* ── Ratio definitions, from schema.ratio_defs ────────────────────────────
   Arabic name, unit and the help text the product already writes. */
export type RatioUnit = "%" | "x" | "IQD" | "";
export const RATIOS: Record<string, { ar: string; unit: RatioUnit; help: string }> = {
  eps: { ar: "ربحية السهم", unit: "IQD", help: "حصة السهم الواحد من صافي أرباح الشركة، وتُحسب بقسمة صافي الربح على عدد الأسهم." },
  bvps: { ar: "القيمة الدفترية للسهم", unit: "IQD", help: "حقوق الملكية مقسومة على عدد الأسهم." },
  pe: { ar: "مكرر الربحية", unit: "x", help: "سعر السهم مقسوماً على ربحية السهم. الأدنى يعني تقييماً أرخص مقابل الأرباح الحالية." },
  pb: { ar: "السعر إلى القيمة الدفترية", unit: "x", help: "سعر السهم مقسوماً على القيمة الدفترية للسهم." },
  ps: { ar: "السعر إلى المبيعات", unit: "x", help: "القيمة السوقية مقسومة على الإيرادات السنوية." },
  dividend_yield: { ar: "عائد التوزيعات", unit: "%", help: "التوزيعات النقدية السنوية كنسبة من سعر السهم." },
  roe: { ar: "العائد على حقوق الملكية", unit: "%", help: "صافي الربح كنسبة من حقوق المساهمين — كفاءة الشركة في تحقيق أرباح من أموال المالكين. الأعلى أفضل." },
  roa: { ar: "العائد على الأصول", unit: "%", help: "صافي الربح كنسبة من إجمالي الأصول." },
  gross_margin: { ar: "هامش الربح الإجمالي", unit: "%", help: "الربح الإجمالي كنسبة من الإيرادات." },
  operating_margin: { ar: "هامش الربح التشغيلي", unit: "%", help: "الربح التشغيلي كنسبة من الإيرادات." },
  net_margin: { ar: "هامش صافي الربح", unit: "%", help: "صافي الربح كنسبة من الإيرادات." },
  revenue_growth_yoy: { ar: "نمو الإيرادات", unit: "%", help: "تغيّر الإيرادات مقارنة بالسنة المالية السابقة." },
  net_income_growth_yoy: { ar: "نمو صافي الربح", unit: "%", help: "تغيّر صافي الربح مقارنة بالسنة المالية السابقة." },
  current_ratio: { ar: "نسبة التداول", unit: "x", help: "الأصول المتداولة مقسومة على المطلوبات قصيرة الأجل — قدرة الشركة على سداد التزاماتها القصيرة. أعلى من 1 أفضل." },
  debt_to_equity: { ar: "الدين إلى حقوق الملكية", unit: "%", help: "إجمالي المطلوبات كنسبة من حقوق الملكية." },
  debt_to_assets: { ar: "الدين إلى الأصول", unit: "%", help: "إجمالي المطلوبات كنسبة من إجمالي الأصول." },
  capital_adequacy_ratio: { ar: "كفاية رأس المال", unit: "%", help: "رأس المال التنظيمي كنسبة من الأصول المرجّحة بالمخاطر. الحد الأدنى الرقابي 12%." },
  npl_ratio: { ar: "نسبة التعثر", unit: "%", help: "التسهيلات المتعثرة كنسبة من إجمالي التسهيلات. الأدنى أفضل." },
  loan_to_deposit: { ar: "القروض إلى الودائع", unit: "%", help: "إجمالي التسهيلات مقسومة على ودائع العملاء." },
  deposit_growth_yoy: { ar: "نمو الودائع", unit: "%", help: "تغيّر ودائع العملاء مقارنة بالسنة المالية السابقة." },
};

export const RATIO_GROUPS: { ar: string; keys: string[] }[] = [
  { ar: "التقييم", keys: ["pe", "pb", "ps", "dividend_yield", "eps", "bvps"] },
  { ar: "الربحية", keys: ["roe", "roa", "net_margin", "operating_margin", "gross_margin"] },
  { ar: "النمو", keys: ["revenue_growth_yoy", "net_income_growth_yoy", "deposit_growth_yoy"] },
  { ar: "الملاءة", keys: ["debt_to_equity", "debt_to_assets", "current_ratio", "capital_adequacy_ratio", "npl_ratio", "loan_to_deposit"] },
];

/* ── Data-quality guard ───────────────────────────────────────────────────
   TEMPORARY. Delete this block, its use in `buildFinancials`, and the
   `valuesWithheld` branch in the two pages, once the extraction pipeline
   normalises units correctly.

   ── The defect ───────────────────────────────────────────────────────────
   `value_iqd` is meant to be dinars regardless of the scale the filing
   printed. For most companies it is: filings that change between
   IQD_THOUSANDS, IQD_MILLIONS and IQD still produce a continuous series. For
   the tickers below it is not, and the error is a clean factor of 1,000 in
   one direction or the other — AISP's IQD_THOUSANDS rows read 612,420B where
   its IQD_MILLIONS rows read 612B; TZNI's 2026 Q1 reads 4.58B against
   4,100–4,600B in every other year of its own history.

   ── How the list was produced ────────────────────────────────────────────
   One rule, run over the whole table: within a ticker, a point-in-time anchor
   line (`total_assets` / `total_equity`) must not span more than 20x across
   that company's own filings. A balance-sheet total does not move three
   orders of magnitude. 13 of the 77 tickers that carry an anchor line fail
   it. The list is written out rather than computed at runtime, so nothing
   here guesses and nothing rescales.

   ── Why whole tickers, when the defect is per filing ─────────────────────
   The bad rows are individual filings, not whole companies — most of TZNI's
   history is correct. Withholding the whole ticker therefore hides some good
   figures too. That is the intended direction: a reader who sees four correct
   columns and one silently wrong one has no way to tell which is which, and
   the page cannot mark the wrong one without the same magnitude guess it is
   forbidden to make. Failing closed per ticker is the honest coarse option
   until the source is fixed. */

export type DataQuality = { normalizedValuesTrusted: boolean; reason: string }

const UNIT_DEFECT: DataQuality = {
  normalizedValuesTrusted: false,
  reason: 'known unit-normalization defect in the extracted dataset',
}

export const FINANCIAL_DATA_QUALITY: Record<string, DataQuality> = {
  AISP: UNIT_DEFECT, BAIB: UNIT_DEFECT, BAME: UNIT_DEFECT, BANS: UNIT_DEFECT,
  BGUC: UNIT_DEFECT, BIDB: UNIT_DEFECT, HISH: UNIT_DEFECT, HMAN: UNIT_DEFECT,
  IITC: UNIT_DEFECT, SBPT: UNIT_DEFECT, SIBD: UNIT_DEFECT, SKTA: UNIT_DEFECT,
  TZNI: UNIT_DEFECT,
}

/** False only for a ticker explicitly listed above. No inference. */
export const normalizedValuesTrusted = (ticker: string): boolean =>
  FINANCIAL_DATA_QUALITY[ticker.toUpperCase()]?.normalizedValuesTrusted !== false

/* ── Cells, columns and the built model ───────────────────────────────────── */

export type Cell = { v: number | null; conflict?: boolean }

export type ColMeta = {
  col: Col
  /** The filing this column came from, where one is indexed. */
  pdfUrl: string | null
  /** The unit the filing itself declared. Provenance, not a scale factor —
   *  `value_iqd` is already normalised to dinars. */
  reportedUnit: string | null
}

export type Financials = {
  template: 'industrial' | 'bank'
  /** Newest first. */
  annualCols: ColMeta[]
  quarterCols: ColMeta[]
  /** `${statement}:${line_key}:${year}:${period}` → cell */
  facts: Map<string, Cell>
  /** `${ratio_key}:${year}` → value */
  ratios: Map<string, number>
  /** line_key → the filing's own Arabic wording, where the source gives one. */
  sourceLabels: Map<string, string>
  /** Fiscal years with an annual filing, oldest first. */
  years: number[]
  /** The most recent period actually filed. */
  latest: ColMeta | null
  /** Distinct units the filings behind these columns declared. */
  reportedUnits: string[]
  /** Cells dropped because two extractions disagreed and the unit could not
   *  separate them. Surfaced rather than silently blank. */
  conflicts: number
  /** The ticker is on the data-quality list: columns and their filing links
   *  are real, but no normalised value may be shown. */
  valuesWithheld: boolean
}

export type FactRow = {
  fiscal_year: number; period: string; statement: string
  line_key: string; value_iqd: number | null
  unit_reported: string | null; source_label_ar: string | null
}
export type RatioRow = { fiscal_year: number; period: string; ratio_key: string; value: number | null }
export type ReportRow = {
  fiscal_year: number; period: string; pdf_url: string | null
  unit_reported: string | null; template: string | null
}

const PERIOD_RANK: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4, ANNUAL: 5 }

/**
 * Builds the model from real rows. Nothing is computed that was not filed.
 *
 * `value_iqd` is taken as already expressed in dinars. That is checked, not
 * assumed: companies whose filings change scale between years — SMRI going
 * IQD_THOUSANDS → IQD_MILLIONS → IQD, TASC alternating — produce a continuous
 * `total_assets` series, which only holds if the column is normalised. Two
 * tickers (BAIB, BAME) do NOT, spanning three orders of magnitude across their
 * own filings; their statements will read wrong and that is an extraction bug
 * upstream of this file, recorded rather than papered over here.
 */
export function buildFinancials(
  ticker: string, facts: FactRow[], ratios: RatioRow[], reports: ReportRow[],
): Financials | null {
  if (!facts.length && !reports.length) return null
  const withheld = !normalizedValuesTrusted(ticker)

  const template: 'industrial' | 'bank' =
    reports.find(r => r.template === 'bank' || r.template === 'industrial')?.template === 'bank'
      ? 'bank'
      : facts.some(f => f.line_key === 'financing_income' || f.line_key === 'customer_deposits')
        ? 'bank' : 'industrial'

  const repByPeriod = new Map(reports.map(r => [`${r.fiscal_year}:${r.period}`, r]))

  // ── Cells, with the two-extraction rule ──────────────────────────────────
  const grouped = new Map<string, FactRow[]>()
  for (const f of facts) {
    if (f.value_iqd == null) continue
    const k = `${f.statement}:${f.line_key}:${f.fiscal_year}:${f.period}`
    const g = grouped.get(k)
    if (g) g.push(f); else grouped.set(k, [f])
  }

  const cells = new Map<string, Cell>()
  let conflicts = 0
  for (const [k, rows] of Array.from(grouped.entries())) {
    const values = new Set(rows.map(r => r.value_iqd))
    if (values.size === 1) { cells.set(k, { v: rows[0].value_iqd }); continue }
    // Two extractions of one document. The report records the unit the filing
    // declared; the row that matches it is the one that read the filing right.
    const rep = repByPeriod.get(`${rows[0].fiscal_year}:${rows[0].period}`)
    const match = rep?.unit_reported ? rows.filter(r => r.unit_reported === rep.unit_reported) : []
    if (match.length === 1) { cells.set(k, { v: match[0].value_iqd }); continue }
    // Same declared unit, different numbers. Choosing would be a guess.
    cells.set(k, { v: null, conflict: true })
    conflicts++
  }

  // ── Columns, one per filed period ────────────────────────────────────────
  const periodKeys = new Set(facts.map(f => `${f.fiscal_year}:${f.period}`))
  for (const r of reports) periodKeys.add(`${r.fiscal_year}:${r.period}`)

  const all: ColMeta[] = Array.from(periodKeys)
    .map(k => {
      const [y, p] = k.split(':')
      const rep = repByPeriod.get(k)
      return {
        col: { y: Number(y), p: p as Period },
        pdfUrl: rep?.pdf_url ?? null,
        reportedUnit: rep?.unit_reported ?? null,
      }
    })
    // A period indexed as a document but carrying no extracted lines is not a
    // column — it is a filing nobody has parsed yet.
        .filter(c => Array.from(cells.keys()).some(k => k.endsWith(`:${c.col.y}:${c.col.p}`) && cells.get(k)?.v != null))
    .sort((a, b) => b.col.y - a.col.y || PERIOD_RANK[b.col.p] - PERIOD_RANK[a.col.p])

  const annualCols = all.filter(c => c.col.p === 'ANNUAL')
  const quarterCols = all.filter(c => c.col.p !== 'ANNUAL')

  const ratioMap = new Map<string, number>()
  for (const r of ratios) {
    if (r.period !== 'ANNUAL' || r.value == null) continue
    ratioMap.set(`${r.ratio_key}:${r.fiscal_year}`, r.value)
  }

  // The filing's own wording for a line, where the extraction captured one.
  const sourceLabels = new Map<string, string>()
  for (const f of facts) {
    if (f.source_label_ar && !sourceLabels.has(f.line_key)) sourceLabels.set(f.line_key, f.source_label_ar)
  }

  const years = annualCols.map(c => c.col.y).sort((a, b) => a - b)
  const reportedUnits = Array.from(new Set(all.map(c => c.reportedUnit).filter(Boolean) as string[]))

  return {
    template, annualCols, quarterCols,
    // Fail closed. The columns and their filing links survive so the reader
    // can still reach the source document; not one normalised figure does.
    facts: withheld ? new Map() : cells,
    ratios: withheld ? new Map() : ratioMap,
    sourceLabels,
    years, latest: all[0] ?? null, reportedUnits, conflicts: withheld ? 0 : conflicts,
    valuesWithheld: withheld,
  }
}

/* ── Units and formatting ─────────────────────────────────────────────────── */

export type Unit = { div: number; label: string }
const UNITS: Unit[] = [
  { div: 1, label: 'دينار' },
  { div: 1e3, label: 'ألف دينار' },
  { div: 1e6, label: 'مليون دينار' },
  { div: 1e9, label: 'مليار دينار' },
  { div: 1e12, label: 'تريليون دينار' },
]

/**
 * Chosen from the MEDIAN absolute value, not the maximum.
 *
 * Scaling to the largest line — which on a balance sheet is the total, often
 * three orders above the smallest — prints «0.02 / 0.11 / 0.56 تريليون» and
 * collapses the statement into a column of zeroes. The median puts the typical
 * line in a readable range and lets the total carry the extra digits.
 */
export function pickUnit(values: number[]): Unit {
  const abs = values.map(v => Math.abs(v)).filter(v => v > 0).sort((a, b) => a - b)
  if (!abs.length) return UNITS[0]
  const median = abs[Math.floor(abs.length / 2)]
  let unit = UNITS[0]
  for (const u of UNITS) if (median / u.div >= 1) unit = u
  return unit
}

const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** A number with the statement's unit divided out. Negatives carry a true
 *  minus sign, not parentheses — an accounting convention a general reader
 *  misreads as a footnote. */
export function fmtUnit(v: number | null, unit: Unit): string {
  if (v == null) return '—'
  return `${v < 0 ? '−' : ''}${nf2.format(Math.abs(v) / unit.div)}`
}

export function fmtRatio(v: number | null | undefined, unit: RatioUnit): string {
  if (v == null) return '—'
  if (unit === '%') return `${(v * 100).toFixed(1)}%`
  if (unit === 'x') return `${v.toFixed(2)}×`
  if (unit === 'IQD') return v.toFixed(3)
  return v.toFixed(2)
}

/** The unit as the filing declared it, for provenance. Never a scale factor. */
export const UNIT_AR: Record<string, string> = {
  IQD: 'دينار',
  IQD_THOUSANDS: 'ألف دينار',
  IQD_MILLIONS: 'مليون دينار',
}

/**
 * Neutral, by policy. The period CODE and the year, never a duration — see
 * the header. «سنوي» is safe because ANNUAL is unambiguous.
 */
export const colLabel = (c: Col) => (c.p === 'ANNUAL' ? `سنوي ${c.y}` : `${c.p} ${c.y}`)
export const colKey = (c: Col) => `${c.y}:${c.p}`
