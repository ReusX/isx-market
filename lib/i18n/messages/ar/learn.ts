/**
 * /learn and /learn/trading-from-zero.
 *
 * ── The library is genuinely empty, and says so ───────────────────────────
 * WordPress category 4 holds zero posts. The empty state says content will
 * appear when it is published — it does not invent articles, and it does not
 * dress the one real guide up as a library.
 *
 * ── The guide is the only real Learn article ──────────────────────────────
 * `/learn/trading-from-zero` is hand-authored in this repo, which is why it is
 * the one Learn route with an English twin. CMS-authored `/learn/[slug]`
 * articles are Arabic-only and are not mirrored — see `lib/i18n/routes.ts`.
 */
export const learn = {
  title: 'تعلّم',
  startHere: 'ابدأ من هنا',
  start: 'ابدأ',
  latest: 'أحدث المقالات',
  allArticles: 'جميع المقالات',
  searchLabel: 'ابحث في التعلّم',
  searchPlaceholder: 'ابحث في المقالات…',
  ofTotal: (shown: string, total: string) => `${shown} من ${total}`,
  clear: 'مسح',
  clearSearch: 'مسح البحث',
  showMore: 'عرض المزيد',

  emptyTitle: 'المحتوى قيد الإعداد',
  emptyNote:  'ستظهر المقالات هنا فور نشرها.',
  libraryDown: 'تعذّر تحميل المكتبة حالياً. «ابدأ من هنا» أعلاه لا يزال متاحاً.',
  noResults: 'لا نتائج',
  noResultsNote: 'جرّب كلمة أخرى أو امسح البحث.',
  nothingToSearch: 'لا توجد مقالات للبحث فيها بعد.',
  libraryFailed: 'تعذّر تحميل المكتبة، فلا يمكن البحث فيها الآن.',

  crumbsLabel: 'مسار التنقل',
  guideIntro: 'هل تريد الاستثمار في بورصة العراق لكنك لا تعرف من أين تبدأ؟ هذا الدليل يشرح',
  minutes: (n: string) => `${n} دقيقة`,
  minutesPlural: (n: string) => `${n} دقائق`,
  lastUpdated: (d: string) => `آخر تحديث ${d}`,

  pathTitle: 'تعلم تداول الأسهم من الصفر',
  pathSummary: 'دليل المبتدئين: ما هي بورصة العراق، كيف تبدأ، وكيف تقرأ سعر السهم.',
  guideH1: 'تعلم تداول الأسهم من الصفر · دليل المبتدئين في بورصة العراق',
  guideStandfirst: 'كل ما تحتاج معرفته من الصفر · من مفهوم التداول وحتى أول صفقة.',
  sectionsCount: (n: string) => `${n} أقسام`,
  pathSections: 'أقسام المسار',
  ofSections: (i: string, n: string) => `${i} من ${n}`,
  afterPath: 'بعد المسار',
  followMarket: 'تابع السوق',
  market: 'السوق',
}
