/**
 * /statistics/ownership and /statistics/shareholders.
 *
 * ⚠ These two panels are still on PRE-REDESIGN chrome — they were carried
 * forward rather than rebuilt, and that is recorded in the report. What is
 * done here is the copy pass and the locale wiring; the visual work is a
 * separate, unrelated job.
 *
 * The monthly ownership report is a SCANNED document. Company names are
 * extracted from it and matched against the canonical register at display
 * time, which is why an unmatched name shows exactly as the report printed it.
 */
export const ownership = {
  monthly: 'شهري',
  showAll: 'عرض الكل',
  breadcrumb: 'إحصاءات السوق',
  majorHolder: 'مساهم كبير',
  companyUnit: 'شركة',
  foreignHolders: 'حملة أجانب',
  foreignHoldersLong: 'حملة أسهم أجانب',
  companiesWithForeign: 'شركات بملكية أجنبية',
  foreignHeldShares: 'أسهم مملوكة لأجانب',
  searchCompany: 'ابحث عن شركة…',
  searchCompanyOrHolder: 'ابحث عن شركة أو مساهم…',
  sharesHolders: (shares: string, holders: string) => `${shares} سهم · ${holders} حامل`,
  foreignShareholder: 'مساهم أجنبي',
  resultsCount: (n: string) => `${n} نتيجة`,
  ownershipH1: 'هيكل الملكية · عراقي مقابل أجنبي',
  ownershipSub: 'توزيع رأس المال المودع بين المستثمرين العراقيين والأجانب',
  shareholdersH1: 'كبار المساهمين',
  shareholdersH1Sub: 'أكبر الحصص المعلنة في الشركات المدرجة',
  structureTitle: 'هيكل الملكية',
  structureSub: 'عراقي مقابل أجنبي',
  withMonth: (label: string, month: string) => `${label} · ${month}`,
  unavailable: 'غير متاح.',
  foreignOwnership: 'ملكية أجنبية',
  iraqi: 'عراقي',
  foreign: 'أجنبي',
  noData: 'بيانات الملكية غير متاحة.',
  byForeign: (n: string) => `الشركات حسب الملكية الأجنبية (${n})`,
  sortPct: 'النسبة',
  sortShares: 'الأسهم',
  sortHolders: 'الحملة',
  noResults: 'لا نتائج.',

  shareholdersTitle: 'كبار المساهمين',
  shareholdersSub: 'أكبر الحصص',
  noShareholders: 'لا توجد بيانات مساهمين.',
  all: 'الكل',
  noMatch: 'لا نتائج مطابقة.',
}
