/** The application frame: header, search, rail, mobile sheet, footer. */
export const shell = {
  menu:            'القائمة',
  navMain:         'التنقل الرئيسي',
  navMobile:       'التنقل',
  brandHome:       'IQWealth · الرئيسية',
  collapse:        'طي القائمة الجانبية',
  expand:          'توسيع القائمة الجانبية',
  toLight:         'التبديل إلى الوضع الفاتح',
  toDark:          'التبديل إلى الوضع الداكن',
  account:         'الحساب',
  signIn:          'تسجيل الدخول',
  signInLong:      'تسجيل الدخول · أنشئ حسابك المجاني',

  search: {
    trigger:     'ابحث عن شركة أو رمز…',
    dialog:      'البحث عن شركة',
    placeholder: 'ابحث عن شركة أو رمز…',
    results:     'النتائج',
    close:       'إغلاق',
    hint:        'اكتب اسم شركة أو رمزها.',
    empty:       (q: string) => `لا نتائج لـ «${q}».`,
    keyMove:     'للتنقل',
    keyOpen:     'للفتح',
    keyClose:    'للإغلاق',
  },

  language: {
    /** Announced to a screen reader. Names the destination language in that
     *  language, then says what pressing it does — «English» alone is a label
     *  with no verb, and a flag is not a language. */
    toEnglish: 'English — switch to the English version',
    toArabic:  'العربية — التبديل إلى النسخة العربية',
    group:     'اللغة',
  },

  footer: {
    blurb:      'منصّة مجانية للمستثمر العراقي · بيانات يومية من المصادر الرسمية، تحليل، وأدوات بحث.',
    disclaimer: 'البيانات لأغراض إعلامية ولا تُعدّ نصيحة استثمارية.',
  },
}
