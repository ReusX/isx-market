/**
 * Navigation labels, by item id.
 *
 * `lib/navigation.ts` owns the structure — which items exist, in what order,
 * under which group, at which href. It no longer owns their WORDS, because a
 * label that exists in one language only is a route that disappears when you
 * switch.
 *
 * ── Renames in this pass, and why ─────────────────────────────────────────
 *   حركة السوق      → السوق          the page is the market, not one aspect of it
 *   فارز الأسهم     → مستكشف الأسهم   «فارز» reads as a machine part; you explore
 *   الإحصائيات      → إحصاءات السوق   says whose statistics
 *   أخبار السوق     → الأخبار         the section is the news
 *   محفظتي          → المحفظة         the product does not need to say «my» twice
 *   قوائم المتابعة  → قائمة المتابعة  ⚠ SINGULAR. There is one list. The plural
 *                                    advertised a feature that does not exist.
 *   سعر الصرف       → الدولار في العراق  what people actually search and mean
 *   سعر الذهب       → الذهب
 *   سعر النفط       → النفط
 *   حسابي           → الحساب
 *
 * The group heading was «السوق» too, which would have put the same word on two
 * consecutive lines of the rail once Market took it. It becomes «بيانات السوق».
 */
export const nav = {
  home:      'الرئيسية',
  market:    'السوق',
  screener:  'مستكشف الأسهم',
  stats:     'إحصاءات السوق',
  heatmap:   'خريطة السوق',
  pulse:     'نبض السوق',
  news:      'الأخبار',
  portfolio: 'المحفظة',
  watchlist: 'قائمة المتابعة',
  fx:        'الدولار في العراق',
  gold:      'الذهب',
  oil:       'النفط',
  learn:     'تعلّم',

  groups: {
    market:   'بيانات السوق',
    personal: 'منصتي',
    tools:    'أدوات',
    learn:    'تعلّم',
  },

  info: {
    heading: 'الموقع',
    about:   'من نحن',
    contact: 'تواصل معنا',
    privacy: 'الخصوصية',
    legal:   'إشعار قانوني',
  },
}
