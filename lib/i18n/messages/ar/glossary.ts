/**
 * ONE name per concept, for the whole site.
 *
 * This is the fix for the single most common copy defect in the product: the
 * same number called «قيمة التداول» on the market board, «القيمة» on the
 * homepage and «التداول» in the screener, so a reader cannot tell whether
 * they are looking at the same metric. Every route imports from here.
 *
 * ⚠ Never use a bare «القيمة» / «Value». On the homepage the same column shows
 * market cap under one tab and traded value under another; an ambiguous header
 * there was a real, shipped bug.
 *
 * ⚠ `noPrior` is NOT `unchanged`. A share with no previous close has an
 * unknown change, not a zero one. They are two states and they stay two words.
 */
export const glossary = {
  marketCap:   'القيمة السوقية',
  tradingValue:'قيمة التداول',
  volume:      'حجم التداول',
  trades:      'عدد الصفقات',
  lastPrice:   'آخر سعر',
  lastTraded:  'آخر تداول',
  change:      'التغير',
  price:       'السعر',
  pe:          'مكرر الربحية',
  advancers:   'الرابحون',
  decliners:   'الخاسرون',
  unchanged:   'دون تغير',
  noPrior:     'بلا إغلاق سابق',
  mostActive:  'الأكثر نشاطاً',
  foreignFlow: 'التدفق الأجنبي',
  netFlow:     'صافي التدفق',
  buy:         'شراء',
  sell:        'بيع',
  session:     'جلسة',
  sessions:    'عدد الجلسات',
  sector:      'القطاع',
  sectors:     'القطاعات',
  coverage:    'التغطية',
  stale:       'أسعار قديمة',
  source:      'المصدر',
  filing:      'إفصاح',
  watchlist:   'قائمة المتابعة',
  portfolio:   'المحفظة',
  company:     'الشركة',
  companies:   'الشركات',
  tradedCompanies: 'الشركات المتداولة',
  index:       'المؤشر',
  period:      'الفترة',
  median:      'الوسيط',
  sessionAverage: 'متوسط الجلسة',
  periodTotal: 'مجموع الفترة',
  ticker:      'الرمز',
}
