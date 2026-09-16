/**
 * The site shell of the redesign: the pill navigation and the foot that
 * every rebuilt page wears. The four doors are the information architecture;
 * their names live in home.landing.doors and are read from there.
 */
export const site = {
  brandHome: 'IQWealth · الرئيسية',
  menu:      'القائمة',
  section:   'القسم',
  close:     'إغلاق',
  signIn:    'تسجيل الدخول',
  account:   'حسابي',
  footNote:  'بيانات بورصة العراق للأوراق المالية والبنك المركزي العراقي، تُحدَّث بعد كل جلسة. للاطلاع لا للتداول.',
  legal:     'إشعار قانوني',
  privacy:   'الخصوصية',
  about:     'من نحن',
  contact:   'تواصل معنا',
  rights:    (year: string) => `IQWealth ${year} ©`,
  units:     { tn: 'ترليون', bn: 'مليار', mn: 'مليون', k: 'ألف', iqd: 'دينار', shares: 'سهم' },
}
