/**
 * The site shell of the redesign: the pill navigation and the foot that
 * every rebuilt page wears. The four doors are the information architecture;
 * their names live in home.landing.doors and are read from there.
 */
export const site = {
  brandHome: 'IQWealth · الرئيسية',
  menu:      'القائمة',
  section:   'القسم',
  rail: {
    customise: 'تخصيص',
    done: 'تم',
    tools: 'أدواتي',
    moveUp: 'تحريك للأعلى',
    moveDown: 'تحريك للأسفل',
    hide: 'إخفاء',
    show: 'إظهار',
    remove: 'إزالة',
    addPage: 'إضافة صفحة',
    nothingToAdd: 'كل الصفحات موجودة هنا.',
    cancel: 'إلغاء',
    reset: 'إعادة الترتيب الافتراضي',
  },
  close:     'إغلاق',
  note:      'عن هذه الصفحة',
  signIn:    'تسجيل الدخول',
  account:   'حسابي',
  footNote:  'بيانات بورصة العراق للأوراق المالية والبنك المركزي العراقي، تُحدَّث بعد كل جلسة. للاطلاع لا للتداول.',
  legal:     'إشعار قانوني',
  privacy:   'الخصوصية',
  about:     'من نحن',
  contact:   'تواصل معنا',
  rights:    (year: string) => `IQWealth ${year} ©`,
  sitemap:   'خريطة الموقع',
  tools:     'أدواتي',
  pages: {
    '/': 'السوق', '/market': 'جدول الشركات', '/companies': 'دليل الشركات', '/screener': 'رادار الأسهم', '/heatmap': 'خريطة السوق',
    '/statistics': 'الإحصاءات', '/statistics/foreign-flow': 'التدفق الأجنبي', '/statistics/ownership': 'الملكية الأجنبية', '/statistics/shareholders': 'كبار المساهمين', '/pulse': 'نبض السوق',
    '/banks': 'المصارف', '/banks/deposits': 'فوائد الودائع', '/banks/loans': 'فوائد القروض',
    '/fx': 'سعر الدولار', '/currencies': 'أسعار العملات', '/gold': 'سعر الذهب', '/silver': 'سعر الفضة', '/oil': 'سعر النفط',
    '/learn': 'تعلّم', '/news': 'الأخبار', '/research': 'تحليلات',
    '/portfolio': 'محفظتي', '/watchlist': 'قائمة المتابعة', '/alerts': 'التنبيهات',
  } as Record<string, string>,
  units:     { tn: 'ترليون', bn: 'مليار', mn: 'مليون', k: 'ألف', iqd: 'دينار', shares: 'سهم' },
}
