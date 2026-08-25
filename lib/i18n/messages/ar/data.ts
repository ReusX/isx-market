/**
 * The data-state vocabulary — the words shown INSIDE a module when a specific
 * figure is missing, stale, zero, or failed.
 *
 * Distinct from `system`, which is for whole-page failures. The distinction
 * matters: a module that fails must not take the page with it, and the copy
 * has to make that obvious — «the rest of the page is working» is doing real
 * work in that sentence.
 *
 * ⚠ `unavailable` renders as «—», never as 0. A dash and a zero are two
 * different facts about the world and the product does not blur them.
 */
export const data = {
  unavailable:   'غير متاح',
  noActivity:    'لا نشاط',
  retry:         'أعد المحاولة',
  moduleFailed:  (what: string) => `تعذّر تحميل ${what}`,
  restOfPageOk:  'بقية الصفحة تعمل.',

  /** Reasons attached to a «—». Each says WHY, so the dash is never mute. */
  why: {
    noPriorClose:   'لا يوجد إغلاق سابق',
    noPriorSession: 'لا توجد جلسة سابقة للمقارنة',
    noPriceOrShares:'لا يتوفر سعر أو عدد أسهم',
    notEnoughHistory:'لا يتوفر تاريخ كافٍ',
  },

  /** Module names, for «تعذّر تحميل …». */
  modules: {
    isx60:       'مؤشر ISX60',
    foreignFlow: 'تدفق المستثمر الأجنبي',
    breadth:     'اتساع السوق',
    activity:    'نشاط السوق',
    sectors:     'أداء القطاعات',
    prices:      'أسعار الشركات',
  },
}
