/**
 * System language — the words the product uses when it has nothing to show.
 *
 * One vocabulary for the whole site. Before this, «لا توجد بيانات» was written
 * eleven slightly different ways across eleven routes, which reads to a user as
 * eleven different conditions rather than one.
 *
 * ── The distinctions that must survive translation ────────────────────────
 * `noData`      we asked and the period is genuinely empty.
 * `notEnough`   there is data, but not enough to compute this particular figure.
 * `loadFailed`  the request failed. This is OUR problem, not an empty period.
 * `unavailable` this specific number cannot be shown — never rendered as 0.
 * `notTraded`   the company exists and did not trade. Different from unavailable.
 *
 * Collapsing any pair of these into one sentence is how a reader concludes a
 * real zero is a data gap, or the reverse.
 */
export const system = {
  noData:      'لا توجد بيانات لهذه الفترة',
  notEnough:   'لا تتوفر بيانات كافية لحساب هذا المؤشر',
  loadFailed:  'تعذّر تحميل البيانات',
  retry:       'أعد المحاولة',
  tryAgain:    'حاول مرة أخرى',
  unavailable: 'السعر غير متاح',
  lastTraded:  (date: string) => `آخر تداول: ${date}`,
  notTraded:   'لم تُتداول الشركة في الجلسة الأخيرة',
  noResults:   'لا توجد نتائج',
  differentSearch: 'جرّب بحثاً مختلفاً',
  loading:     'جارٍ التحميل…',

  notFound: {
    metaTitle: 'الصفحة غير موجودة',
    title:     'لا توجد صفحة على هذا المسار',
    note:      'قد يكون الرابط قديماً، أو رمز الشركة غير صحيح.',
    home:      'العودة إلى الرئيسية',
    suggested: 'وجهات مقترحة',
    hintBefore: 'أو اضغط',
    hintAfter:  'للبحث عن شركة بالاسم أو الرمز.',
  },

  fault: {
    title:      'حدث خطأ لدينا',
    note:       'تعذّر إكمال الطلب. المشكلة من جانبنا، ولم يحدث خطأ منك.',
    home:       'العودة إلى الرئيسية',
    hintBefore: 'إن تكرّر الخطأ، أخبرنا عبر',
    contact:    'تواصل معنا',
  },

  /** The root-layout failure screen. Self-contained: no fonts, no tokens. */
  globalFault: {
    title: 'حدث خطأ لدينا',
    note:  'تعذّر تحميل التطبيق. المشكلة من جانبنا.',
    retry: 'أعد المحاولة',
  },
}
