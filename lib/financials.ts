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
  /** The line item as the Iraqi filings name it. */
  ar: string
  /**
   * The standard English accounting name for the same line.
   *
   * ⚠ These are TERMS, not company names — «صافي التسهيلات الائتمانية
   * والتمويل» has an established English rendering and translating it is
   * correct. The prohibition on machine-translating applies to legal COMPANY
   * names, which are never touched. The figures themselves are shown exactly
   * as reported, in either language.
   */
  en: string
  /** Nesting depth. 0 = top level, 1 = component of the line above it. */
  depth: 0 | 1
  /** A summed line: heavier, ruled above. */
  subtotal?: boolean
  /** The statement's bottom line: heaviest, ruled top and bottom. */
  total?: boolean
}

export const TEMPLATES: Record<"industrial" | "bank", Partial<Record<StatementId, { label: string; labelEn: string; lines: Line[] }>>> = {
  industrial: {
    income: {
      label: "قائمة الدخل", labelEn: "Income statement",
      lines: [
        { key: "revenue", ar: "الإيرادات", en: "Revenue", depth: 0 },
        { key: "salaries_wages", ar: "الرواتب والأجور", en: "Salaries and wages", depth: 1 },
        { key: "goods_supplies", ar: "المستلزمات السلعية", en: "Goods and materials", depth: 1 },
        { key: "service_supplies", ar: "المستلزمات الخدمية", en: "Services and supplies", depth: 1 },
        { key: "contracts_services", ar: "خدمات العقود", en: "Contracted services", depth: 1 },
        { key: "purchases_opex", ar: "مشتريات ومصاريف تشغيلية", en: "Purchases and operating expenses", depth: 1 },
        { key: "interest_expense", ar: "مصروفات الفوائد", en: "Interest expense", depth: 1 },
        { key: "depreciation_amortization", ar: "الاندثار والإطفاء", en: "Depreciation and amortisation", depth: 1 },
        { key: "taxes_fees", ar: "الضرائب والرسوم", en: "Taxes and fees", depth: 1 },
        { key: "total_operating_expenses", ar: "إجمالي المصروفات التشغيلية", en: "Total operating expenses", depth: 0, subtotal: true },
        { key: "operating_income", ar: "الربح التشغيلي", en: "Operating profit", depth: 0, subtotal: true },
        { key: "other_income", ar: "إيرادات أخرى", en: "Other income", depth: 1 },
        { key: "other_expenses", ar: "مصروفات أخرى", en: "Other expenses", depth: 1 },
        { key: "pretax_income", ar: "الربح قبل الضريبة", en: "Profit before tax", depth: 0, subtotal: true },
        { key: "tax", ar: "ضريبة الدخل", en: "Income tax", depth: 1 },
        { key: "net_income", ar: "صافي الربح", en: "Net profit", depth: 0, total: true },
      ],
    },
    balance: {
      label: "المركز المالي", labelEn: "Balance sheet",
      lines: [
        { key: "net_fixed_assets", ar: "الأصول الثابتة (صافي)", en: "Fixed assets (net)", depth: 1 },
        { key: "deferred_revenue_expenses", ar: "النفقات الإيرادية المؤجلة", en: "Deferred revenue expenditure", depth: 1 },
        { key: "projects_under_construction", ar: "مشاريع تحت التنفيذ", en: "Projects under construction", depth: 1 },
        { key: "total_fixed_assets", ar: "إجمالي الأصول الثابتة", en: "Total fixed assets", depth: 0, subtotal: true },
        { key: "inventory", ar: "المخزون", en: "Inventory", depth: 1 },
        { key: "investments", ar: "الاستثمارات", en: "Investments", depth: 1 },
        { key: "receivables", ar: "الذمم المدينة", en: "Receivables", depth: 1 },
        { key: "cash", ar: "النقد", en: "Cash", depth: 1 },
        { key: "total_current_assets", ar: "إجمالي الأصول المتداولة", en: "Total current assets", depth: 0, subtotal: true },
        { key: "total_assets", ar: "إجمالي الأصول", en: "Total assets", depth: 0, total: true },
        { key: "paid_capital", ar: "رأس المال المدفوع", en: "Paid-up capital", depth: 1 },
        { key: "reserves", ar: "الاحتياطيات", en: "Reserves", depth: 1 },
        { key: "retained_earnings", ar: "الأرباح المحتجزة", en: "Retained earnings", depth: 1 },
        { key: "total_equity", ar: "إجمالي حقوق الملكية", en: "Total equity", depth: 0, subtotal: true },
        { key: "long_term_provisions", ar: "مخصصات طويلة الأجل", en: "Long-term provisions", depth: 1 },
        { key: "long_term_payables", ar: "ذمم دائنة طويلة الأجل", en: "Long-term payables", depth: 1 },
        { key: "short_term_provisions", ar: "مخصصات قصيرة الأجل", en: "Short-term provisions", depth: 1 },
        { key: "short_term_payables", ar: "ذمم دائنة قصيرة الأجل", en: "Short-term payables", depth: 1 },
        { key: "total_equity_and_liabilities", ar: "إجمالي حقوق الملكية والمطلوبات", en: "Total equity and liabilities", depth: 0, total: true },
      ],
    },
    cashflow: {
      label: "التدفقات النقدية", labelEn: "Cash flow",
      lines: [
        { key: "cfo", ar: "التدفق النقدي من الأنشطة التشغيلية", en: "Cash flow from operating activities", depth: 0, subtotal: true },
        { key: "capex", ar: "النفقات الرأسمالية", en: "Capital expenditure", depth: 1 },
        { key: "cfi", ar: "التدفق النقدي من الأنشطة الاستثمارية", en: "Cash flow from investing activities", depth: 0, subtotal: true },
        { key: "dividends_paid", ar: "توزيعات الأرباح المدفوعة", en: "Dividends paid", depth: 1 },
        { key: "cff", ar: "التدفق النقدي من الأنشطة التمويلية", en: "Cash flow from financing activities", depth: 0, subtotal: true },
        { key: "net_change_in_cash", ar: "صافي التغير في النقد", en: "Net change in cash", depth: 0, total: true },
        { key: "cash_beginning", ar: "النقد في بداية الفترة", en: "Cash at the beginning of the period", depth: 1 },
        { key: "cash_ending", ar: "النقد في نهاية الفترة", en: "Cash at the end of the period", depth: 0, subtotal: true },
      ],
    },
  },
  bank: {
    income: {
      label: "قائمة الدخل", labelEn: "Income statement",
      lines: [
        { key: "financing_income", ar: "صافي إيرادات الفوائد والتمويل", en: "Net interest and financing income", depth: 0 },
        { key: "revenue_and_commissions", ar: "صافي إيرادات العمولات والأعمال المصرفية", en: "Net commission and banking income", depth: 0 },
        { key: "ga_expenses", ar: "المصروفات العمومية والإدارية", en: "General and administrative expenses", depth: 1 },
        { key: "pretax_income", ar: "الربح قبل الضريبة", en: "Profit before tax", depth: 0, subtotal: true },
        { key: "tax", ar: "ضريبة الدخل", en: "Income tax", depth: 1 },
        { key: "net_income", ar: "صافي الربح", en: "Net profit", depth: 0, total: true },
      ],
    },
    balance: {
      label: "المركز المالي", labelEn: "Balance sheet",
      lines: [
        { key: "cash_and_cbi", ar: "النقد والأرصدة لدى البنك المركزي", en: "Cash and balances with the Central Bank", depth: 1 },
        { key: "due_from_banks", ar: "الأرصدة لدى المصارف", en: "Balances with banks", depth: 1 },
        { key: "islamic_financing", ar: "صافي التسهيلات الائتمانية والتمويل", en: "Net credit facilities and financing", depth: 1 },
        { key: "investments", ar: "الاستثمارات", en: "Investments", depth: 1 },
        { key: "fixed_assets", ar: "الأصول الثابتة", en: "Fixed assets", depth: 1 },
        { key: "total_assets", ar: "إجمالي الأصول", en: "Total assets", depth: 0, total: true },
        { key: "customer_deposits", ar: "ودائع العملاء", en: "Customer deposits", depth: 1 },
        { key: "due_to_banks", ar: "المستحق للمصارف", en: "Due to banks", depth: 1 },
        { key: "other_liabilities", ar: "مطلوبات أخرى", en: "Other liabilities", depth: 1 },
        { key: "paid_capital", ar: "رأس المال المدفوع", en: "Paid-up capital", depth: 1 },
        { key: "reserves", ar: "الاحتياطيات", en: "Reserves", depth: 1 },
        { key: "retained_earnings", ar: "الأرباح المحتجزة", en: "Retained earnings", depth: 1 },
        { key: "total_equity", ar: "إجمالي حقوق الملكية", en: "Total equity", depth: 0, subtotal: true },
        { key: "total_liabilities_and_equity", ar: "إجمالي المطلوبات وحقوق الملكية", en: "Total liabilities and equity", depth: 0, total: true },
      ],
    },
    metrics: {
      label: "المؤشرات المصرفية", labelEn: "Banking indicators",
      lines: [
        { key: "capital_adequacy_ratio", ar: "كفاية رأس المال", en: "Capital adequacy ratio", depth: 0 },
        { key: "lcr", ar: "نسبة تغطية السيولة", en: "Liquidity coverage ratio", depth: 0 },
        { key: "nsfr", ar: "صافي التمويل المستقر", en: "Net stable funding ratio", depth: 0 },
        { key: "npl_ratio", ar: "نسبة التعثر", en: "Non-performing loan ratio", depth: 0 },
      ],
    },
  },
};

/* ── Ratio definitions, from schema.ratio_defs ────────────────────────────
   Arabic name, unit and the help text the product already writes. */
export type RatioUnit = "%" | "x" | "IQD" | "";
export const RATIOS: Record<string, { ar: string; en: string; unit: RatioUnit; help: string; helpEn: string }> = {
  eps: { ar: "ربحية السهم", en: "Earnings per share", unit: "IQD", help: "حصة السهم الواحد من صافي أرباح الشركة، وتُحسب بقسمة صافي الربح على عدد الأسهم.", helpEn: "The company's net profit attributable to one share, computed as net profit divided by the number of shares." },
  bvps: { ar: "القيمة الدفترية للسهم", en: "Book value per share", unit: "IQD", help: "حقوق الملكية مقسومة على عدد الأسهم.", helpEn: "Shareholders' equity divided by the number of shares." },
  pe: { ar: "مكرر الربحية", en: "Price / earnings", unit: "x", help: "سعر السهم مقسوماً على ربحية السهم. الأدنى يعني تقييماً أرخص مقابل الأرباح الحالية.", helpEn: "Share price divided by earnings per share. Lower means a cheaper valuation against current earnings." },
  pb: { ar: "السعر إلى القيمة الدفترية", en: "Price / book", unit: "x", help: "سعر السهم مقسوماً على القيمة الدفترية للسهم.", helpEn: "Share price divided by book value per share." },
  ps: { ar: "السعر إلى المبيعات", en: "Price / sales", unit: "x", help: "القيمة السوقية مقسومة على الإيرادات السنوية.", helpEn: "Market capitalisation divided by annual revenue." },
  dividend_yield: { ar: "عائد التوزيعات", en: "Dividend yield", unit: "%", help: "التوزيعات النقدية السنوية كنسبة من سعر السهم.", helpEn: "Annual cash dividends as a percentage of the share price." },
  roe: { ar: "العائد على حقوق الملكية", en: "Return on equity", unit: "%", help: "صافي الربح كنسبة من حقوق المساهمين — كفاءة الشركة في تحقيق أرباح من أموال المالكين. الأعلى أفضل.", helpEn: "Net profit as a percentage of shareholders' equity — how efficiently the company turns owners' money into profit. Higher is better." },
  roa: { ar: "العائد على الأصول", en: "Return on assets", unit: "%", help: "صافي الربح كنسبة من إجمالي الأصول.", helpEn: "Net profit as a percentage of total assets." },
  gross_margin: { ar: "هامش الربح الإجمالي", en: "Gross margin", unit: "%", help: "الربح الإجمالي كنسبة من الإيرادات.", helpEn: "Gross profit as a percentage of revenue." },
  operating_margin: { ar: "هامش الربح التشغيلي", en: "Operating margin", unit: "%", help: "الربح التشغيلي كنسبة من الإيرادات.", helpEn: "Operating profit as a percentage of revenue." },
  net_margin: { ar: "هامش صافي الربح", en: "Net profit margin", unit: "%", help: "صافي الربح كنسبة من الإيرادات.", helpEn: "Net profit as a percentage of revenue." },
  revenue_growth_yoy: { ar: "نمو الإيرادات", en: "Revenue growth", unit: "%", help: "تغيّر الإيرادات مقارنة بالسنة المالية السابقة.", helpEn: "Change in revenue against the previous financial year." },
  net_income_growth_yoy: { ar: "نمو صافي الربح", en: "Net profit growth", unit: "%", help: "تغيّر صافي الربح مقارنة بالسنة المالية السابقة.", helpEn: "Change in net profit against the previous financial year." },
  current_ratio: { ar: "نسبة التداول", en: "Current ratio", unit: "x", help: "الأصول المتداولة مقسومة على المطلوبات قصيرة الأجل — قدرة الشركة على سداد التزاماتها القصيرة. أعلى من 1 أفضل.", helpEn: "Current assets divided by short-term liabilities — the company's ability to meet its near-term obligations. Above 1 is better." },
  debt_to_equity: { ar: "الدين إلى حقوق الملكية", en: "Debt to equity", unit: "%", help: "إجمالي المطلوبات كنسبة من حقوق الملكية.", helpEn: "Total liabilities as a percentage of equity." },
  debt_to_assets: { ar: "الدين إلى الأصول", en: "Debt to assets", unit: "%", help: "إجمالي المطلوبات كنسبة من إجمالي الأصول.", helpEn: "Total liabilities as a percentage of total assets." },
  capital_adequacy_ratio: { ar: "كفاية رأس المال", en: "Capital adequacy ratio", unit: "%", help: "رأس المال التنظيمي كنسبة من الأصول المرجّحة بالمخاطر. الحد الأدنى الرقابي 12%.", helpEn: "Regulatory capital as a percentage of risk-weighted assets. The regulatory minimum is 12%." },
  npl_ratio: { ar: "نسبة التعثر", en: "Non-performing loan ratio", unit: "%", help: "التسهيلات المتعثرة كنسبة من إجمالي التسهيلات. الأدنى أفضل.", helpEn: "Non-performing facilities as a percentage of total facilities. Lower is better." },
  loan_to_deposit: { ar: "القروض إلى الودائع", en: "Loan to deposit", unit: "%", help: "إجمالي التسهيلات مقسومة على ودائع العملاء.", helpEn: "Total facilities divided by customer deposits." },
  deposit_growth_yoy: { ar: "نمو الودائع", en: "Deposit growth", unit: "%", help: "تغيّر ودائع العملاء مقارنة بالسنة المالية السابقة.", helpEn: "Change in customer deposits against the previous financial year." },
};

export const RATIO_GROUPS: { ar: string; en: string; keys: string[] }[] = [
  { ar: "التقييم", en: "Valuation", keys: ["pe", "pb", "ps", "dividend_yield", "eps", "bvps"] },
  { ar: "الربحية", en: "Profitability", keys: ["roe", "roa", "net_margin", "operating_margin", "gross_margin"] },
  { ar: "النمو", en: "Growth", keys: ["revenue_growth_yoy", "net_income_growth_yoy", "deposit_growth_yoy"] },
  { ar: "الملاءة", en: "Solvency", keys: ["debt_to_equity", "debt_to_assets", "current_ratio", "capital_adequacy_ratio", "npl_ratio", "loan_to_deposit"] },
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

export type Unit = { div: number; label: string; labelEn: string }
const UNITS: Unit[] = [
  { div: 1,    label: 'دينار',         labelEn: 'dinars' },
  { div: 1e3,  label: 'ألف دينار',     labelEn: 'thousand dinars' },
  { div: 1e6,  label: 'مليون دينار',   labelEn: 'million dinars' },
  { div: 1e9,  label: 'مليار دينار',   labelEn: 'billion dinars' },
  { div: 1e12, label: 'تريليون دينار', labelEn: 'trillion dinars' },
]

/** The scale label in the reader's language. */
export const unitLabel = (u: Unit, locale: 'ar' | 'en') => (locale === 'ar' ? u.label : u.labelEn)

/** A statement's heading in the reader's language. */
export const stmtLabel = (s: { label: string; labelEn: string }, locale: 'ar' | 'en') =>
  (locale === 'ar' ? s.label : s.labelEn)

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

export const UNIT_EN: Record<string, string> = {
  IQD: 'dinars',
  IQD_THOUSANDS: 'thousand dinars',
  IQD_MILLIONS: 'million dinars',
}

export const reportedUnitLabel = (code: string, locale: 'ar' | 'en') =>
  (locale === 'ar' ? UNIT_AR[code] : UNIT_EN[code]) ?? code

/**
 * Neutral, by policy. The period CODE and the year, never a duration — see
 * the header. «سنوي» / «Annual» is safe because ANNUAL is unambiguous; a
 * quarter code is printed as the code itself, because the FILING does not
 * state the quarter's duration and this product refuses to infer one.
 */
export const colLabel = (c: Col, locale: 'ar' | 'en' = 'ar') =>
  (c.p === 'ANNUAL' ? `${locale === 'ar' ? 'سنوي' : 'Annual'} ${c.y}` : `${c.p} ${c.y}`)
export const colKey = (c: Col) => `${c.y}:${c.p}`
