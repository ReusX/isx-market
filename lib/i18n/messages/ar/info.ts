/**
 * /about and /contact.
 *
 * ── The letter is not marketing copy ──────────────────────────────────────
 * The About page's body is a personal welcome letter signed by the person who
 * built the site. It is the most credible thing in the product — a named human
 * saying this is free, it is for you, and it is not finished — and it is kept
 * verbatim, not rewritten into product voice. The English version translates
 * that letter; it does not compose a new one, and it adds no claim the Arabic
 * does not make: no team, no founding year, no coverage figure, no regulatory
 * status, no accuracy guarantee.
 *
 * ── The empty slot stays empty ────────────────────────────────────────────
 * «من أين تأتي البيانات» is a labelled section with an honest note and nothing
 * under it, because the product has no published methodology. An empty slot is
 * a question; filling it with plausible sentences would be an answer nobody
 * has earned.
 */
export const info = {
  about: {
    eyebrow:    'من نحن',
    title:      'أهلاً بك، عزيزي المستثمر',
    standfirst: 'منصّة مجانية تساعد المستثمر العراقي على اتخاذ قراراته ببيانات يومية.',

    letter1: 'ترحيبٌ خاصٌّ بك، عزيزي المستثمر. أنشأ هذا الموقع',
    letterAuthor: 'أحمد بلحة',
    letter1b: '، كاتبٌ ماليّ ومستثمرٌ في الأسهم الأمريكية والعراقية.',
    letter2: 'الموقع مجانيّ تماماً، وقد صُمّم لمساعدة المستثمرين العراقيين على اتخاذ قراراتهم. لا يزال قيد التطوير وستُضاف إليه ميزاتٌ أكثر بكثير، لكن يمكنك الاعتماد عليه في الحصول على معلوماتك اليومية بكل تأكيد.',
    signOff: 'مع كل الشكر،',
    signName: 'أحمد.',

    claimsHeading: 'ما هذه المنصة',
    claimFreeTerm: 'مجانية',
    claimFreeDesc: 'الوصول إلى كل الصفحات دون اشتراك.',
    claimDailyTerm: 'يومية',
    claimDailyDesc: 'بيانات الجلسة والشركات تُحدَّث مع كل جلسة تداول.',
    claimBuildingTerm: 'قيد التطوير',
    claimBuildingDesc: 'تُضاف الميزات تباعاً، والقائم عليها معلن.',

    sourcesHeading: 'من أين تأتي البيانات',
    sourcesNote: 'هذا القسم مخصّص لمصادر البيانات ومنهجية التحديث. المحتوى النهائي يُكتب لاحقاً.',

    reachHeading: 'للتواصل',
    reachGo: 'كل طرق التواصل',
  },

  contact: {
    eyebrow:    'تواصل معنا',
    title:      'يسعدنا سماعك',
    standfirst: 'سؤال، اقتراح، أو بلاغ عن مشكلة — الوصول إلينا بخطوة واحدة.',

    emailHeading: 'البريد الإلكتروني',
    replyTime:    'نرد عادةً خلال 1–2 يوم عمل',
    copy:         'نسخ العنوان',
    copied:       'تم النسخ',
    copiedAnnounce: 'تم نسخ البريد الإلكتروني',

    channelsHeading: 'قنوات أخرى',
    phone:           'الهاتف',
    newWindow:       'يفتح في نافذة جديدة',

    topicsHeading: 'اختر موضوع الرسالة',
    topicsNote:    'اختر موضوعاً ليُفتح بريد جاهز بالعنوان المناسب.',
    /* Destination-based, from the brief. Each opens a prefilled mailto —
       one mailbox, no router, no ticket id, no queue. The chips are honest
       precisely because they promise nothing but an addressed email. */
    topics: {
      data:      { label: 'مشكلة في البيانات', subject: 'مشكلة في البيانات' },
      account:   { label: 'مشكلة في الحساب',   subject: 'مشكلة في الحساب' },
      fix:       { label: 'تصحيح معلومة',      subject: 'تصحيح معلومة' },
      idea:      { label: 'اقتراح',            subject: 'اقتراح' },
      partner:   { label: 'شراكة',             subject: 'استفسار شراكة' },
      other:     { label: 'أمر آخر',           subject: 'استفسار عام' },
    },
  },

  familyLabel: 'صفحات الموقع',
}
