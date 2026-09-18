import 'server-only'

/**
 * Two slow series the Central Bank moves by decision, not by market:
 * the policy rate (a handful of changes in twenty years) and inflation
 * (one print a month from the Central Statistical Organization).
 *
 * The policy-rate history is written out by hand, with the source of each
 * step — there is no free feed for it, and it changes rarely enough that a
 * commit per decision is the right cadence. Annual inflation comes live
 * from the World Bank API (CSO data, revalidated weekly); the latest monthly
 * print is entered by hand with its month, because CSO publishes a PDF.
 */
export interface RateStep {
  date: string          // YYYY-MM-DD, or YYYY-MM when only the month is published
  rate: number
  note: string
  source: string
  approx?: boolean      // the step is documented, the exact day is not
}

export const CURRENT_POLICY_RATE = 5.5
export const POLICY_RATE_SINCE = '2024-10-24'

/** Milestones, newest first. Intermediate 2008–2009 steps are summarised, not invented. */
export const POLICY_RATE_HISTORY: RateStep[] = [
  { date: '2024-10-24', rate: 5.5,  note: 'خفض من 7.5% مع إعادة تفعيل شهادات الإيداع (4% لأجل 14 يوماً، 5.5% لأجل 182 يوماً)', source: 'قرار البنك المركزي العراقي، 24 تشرين الأول 2024' },
  { date: '2023-06',    rate: 7.5,  note: 'رفع من 4% لامتصاص السيولة وكبح التضخم بعد تغيير سعر الصرف', source: 'تقرير السياسة النقدية 2023، البنك المركزي العراقي', approx: true },
  { date: '2016-03',    rate: 4.0,  note: 'أدنى مستوى في تاريخ البنك؛ بقي سبع سنوات', source: 'البنك المركزي العراقي', approx: true },
  { date: '2010-04',    rate: 6.0,  note: 'آخر خفض في سلسلة 2008–2010 التي أعادت الفائدة من 20% إلى 6%', source: 'البنك المركزي العراقي', approx: true },
  { date: '2009-12',    rate: 7.0,  note: 'سلسلة تخفيضات خلال 2009 (نحو 8.8% بنهاية العام بحسب سعر الخصم)', source: 'البنك المركزي العراقي', approx: true },
  { date: '2008-12',    rate: 15.0, note: 'بداية التخفيض بعد انحسار التضخم (سعر الخصم نحو 16.75% بنهاية 2008)', source: 'البنك المركزي العراقي', approx: true },
  { date: '2007-12',    rate: 20.0, note: 'الذروة التاريخية: رُفعت الفائدة على مرحلتين من تشرين الثاني 2006 لمواجهة تضخم تجاوز 50%', source: 'صندوق النقد الدولي، مشاورات المادة الرابعة 2007', approx: true },
  { date: '2006-11',    rate: 16.0, note: 'أول رفع كبير مع بدء سياسة تقوية الدينار', source: 'صندوق النقد الدولي', approx: true },
  { date: '2004-03',    rate: 6.0,  note: 'استقلال البنك المركزي بقانونه الجديد وبدء سعر السياسة النقدية', source: 'البنك المركزي العراقي', approx: true },
]

export interface InflationYear { year: number; rate: number }

/** Annual CPI inflation, oldest first, from the World Bank (CSO data). */
export async function fetchInflationAnnual(): Promise<InflationYear[]> {
  try {
    const res = await fetch(
      'https://api.worldbank.org/v2/country/IQ/indicator/FP.CPI.TOTL.ZG?format=json&per_page=40&date=2004:2030',
      { next: { revalidate: 7 * 86400 }, signal: AbortSignal.timeout(9000) },
    )
    if (!res.ok) return []
    const j = (await res.json()) as [unknown, { date: string; value: number | null }[]]
    return (j[1] ?? [])
      .filter((r) => r.value != null)
      .map((r) => ({ year: Number(r.date), rate: Math.round((r.value as number) * 10) / 10 }))
      .sort((a, b) => a.year - b.year)
  } catch { return [] }
}

/** The latest monthly print, entered by hand from the CSO release. Update monthly. */
export const INFLATION_LATEST = {
  month: '2026-06',
  yoy: 3.1,
  prevYoy: 3.0,
  core: 3.0,
  food: 1.6,
  source: 'الجهاز المركزي للإحصاء، الرقم القياسي لأسعار المستهلك (الأساس 2022 = 100)',
}
