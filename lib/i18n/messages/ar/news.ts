/**
 * /news — الأخبار.
 *
 * ── Two feeds, two failure modes ──────────────────────────────────────────
 * Editorial articles and company filings come from different sources, and when
 * one is down the page says WHICH and confirms the other is current. A single
 * «تعذّر التحميل» would make a reader distrust figures that are perfectly fine.
 *
 * ── On the English page ───────────────────────────────────────────────────
 * The chrome here is translated; the ARTICLES are not. The CMS holds one
 * Arabic body per article and no English translation, so `/en/news` lists the
 * same real items with their language marked and links each to its canonical
 * Arabic article. No `/en/news/[slug]` is generated and no English hreflang is
 * claimed for one — see `lib/i18n/routes.ts`.
 */
export const news = {
  title: 'الأخبار',
  itemsSince: (n: string, day: string) => `${n} عنصراً منذ ${day}`,
  standfirst: 'إفصاحات الشركات وأخبار السوق',
  kindGroup: 'نوع العنصر',
  searchFull: 'ابحث بالعنوان أو الشركة أو الرمز أو المصدر',
  sectorFilter: 'تصفية حسب القطاع',
  coverage: (n: string, from: string, to: string) =>
    `يغطي فهرس الإفصاحات المتاح للعرض ${n} وثيقة منشورة، من ${from} إلى ${to}. ليست كل إفصاحات الفترة متاحة هنا.`,
  showMore: 'عرض المزيد',
  searchLabel: 'بحث في الأخبار',
  searchPlaceholder: 'ابحث في العناوين والشركات…',
  sector: 'القطاع',
  allSectors: 'كل القطاعات',
  matching: 'عنصراً مطابقاً',
  items: 'عنصراً',
  ofTotal: (n: string) => `من ${n}`,
  removeKind: 'إزالة تصفية النوع',
  removeSector: 'إزالة تصفية القطاع',
  clearSearch: 'مسح البحث',
  reset: 'إعادة التعيين',

  kinds: {
    all:     'الكل',
    filing:  'إفصاحات',
    article: 'أخبار',
  },
  sources: {
    filing:  'هيئة الأوراق المالية',
    article: 'تحرير IQWealth',
  },
  financialStatements: 'البيانات المالية',

  articlesDown: 'الأخبار التحريرية غير متاحة مؤقتاً',
  filingsDown:  'الإفصاحات غير متاحة مؤقتاً',
  articlesFailedTitle: 'تعذّر تحميل الأخبار التحريرية',
  articlesFailedNote:  'الإفصاحات أدناه محدّثة. الأخبار التحريرية تأتي من مصدر منفصل.',
  filingsFailedTitle:  'تعذّر تحميل فهرس الإفصاحات',
  filingsFailedNote:   'الأخبار التحريرية أدناه محدّثة. الإفصاحات تأتي من مصدر منفصل.',

  emptyTitle: 'لا توجد عناصر منشورة بعد',
  emptyNote:  'تظهر الإفصاحات فور نشرها من هيئة الأوراق المالية، والأخبار عند صدورها.',
  noMatch: (q: string) => `لا نتائج مطابقة لـ «${q}»`,
  noneInFilter: 'لا عناصر ضمن هذه التصفية',
  tryCompany: 'جرّب اسم شركة أو رمزاً أو كلمة من العنوان.',
  tryOtherFilter: 'جرّب نوعاً آخر أو قطاعاً آخر.',
  filingLink: (kind: string, name: string, headline: string) => `${kind}: ${name} ${headline} · يفتح ملف PDF على موقع هيئة الأوراق المالية`,
  endOfList: (n: string) => `نهاية القائمة · ${n} عنصراً`,
  market: 'السوق',

  /** Shown on the English page beside an item whose body is Arabic. */
  arabicArticle: '',
}
