/**
 * /statistics/ownership and /statistics/shareholders.
 *
 * Both pages read a MONTHLY depository report, so nothing here says «مباشر»,
 * «اليوم» or «الآن». What they can honestly say is which period the report
 * covers and how much of it could be attached to a named company — the report
 * has no ticker column, and roughly half of its company names survive OCR in a
 * form we can prove. The coverage line is therefore product copy, not an
 * apology, and it is on the page whenever coverage is incomplete.
 */
export const ownership = {
  breadcrumb: 'إحصاءات السوق',
  period: 'الفترة',
  source: 'المصدر',
  sourceReport: 'تقرير الإيداع الشهري',
  latestDisclosure: 'آخر إفصاح متاح',
  openSource: 'فتح المصدر',
  company: 'الشركة',
  shareholder: 'المساهم',
  ownershipPct: 'نسبة الملكية',
  searchLabel: 'بحث',
  clear: 'مسح البحث',

  /* ── ملكية الشركات ─────────────────────────────────────────────────── */
  ownershipH1: 'ملكية الشركات',
  ownershipStandfirst: 'توزيع رأس المال المودع بين المستثمرين العراقيين والأجانب، كما ورد في تقرير الإيداع الشهري.',
  foreignOfDeposited: 'ملكية أجنبية من رأس المال المودع',
  iraqiOfDeposited: 'ملكية عراقية',
  companiesInReport: 'شركة في التقرير',
  foreignHeldShares: 'سهم مملوك لأجانب',
  foreignHolders: 'حامل سهم أجنبي',
  matchedToCompany: 'شركة مرتبطة بسجلّها',
  foreignOwnershipCol: 'نسبة الملكية الأجنبية',
  foreignSharesCol: 'أسهم مملوكة لأجانب',
  foreignHoldersCol: 'حملة أجانب',
  ownershipSearch: 'ابحث برمز الشركة أو باسمها',
  ownershipTableTitle: 'الشركات ذات الملكية الأجنبية',
  ownershipTableNote: (shown: string) => `${shown} شركة أمكن ربط سجلّها بالشركة وتحمل ملكية أجنبية في هذه الفترة`,
  noOwnership: 'لا تتوفر بيانات ملكية موثوقة لهذه الفترة.',

  /* ── كبار المساهمين ───────────────────────────────────────────────── */
  shareholdersH1: 'كبار المساهمين',
  shareholdersStandfirst: 'أكبر الحصص المُفصح عنها في الشركات المدرجة، كما ورد في تقرير الإيداع الشهري.',
  largestStake: 'أكبر حصة مُفصح عنها',
  disclosedStakes: 'حصة مُفصح عنها',
  companiesWithDisclosure: 'شركة لديها إفصاح',
  shareholdersSearch: 'ابحث برمز الشركة أو باسم الشركة أو المساهم',
  shareholdersTableTitle: 'الحصص المُفصح عنها',
  shareholdersTableNote: (shown: string) => `${shown} حصة في شركات أمكن ربط سجلّها`,
  noShareholders: 'لا تتوفر بيانات مساهمين موثوقة لهذه الفترة.',
  /* A statement about what the SOURCE recorded, not a claim about the holders,
     and the reason the nationality filter is not on the page. */
  nationalityUniform: 'يسجّل المصدر جنسية عراقية لكل حصة مُفصح عنها في هذه الفترة.',

  /* ── التغطية والحالات الفارغة ──────────────────────────────────────── */
  coverageNote: 'تختلف تغطية بيانات الملكية بين الشركات. نعرض السجلات التي أمكن ربطها بالشركة بشكل موثوق، ولا نخمن عند تعذر المطابقة.',
  coverageCount: (matched: string, total: string) => `${matched} من ${total} اسم في التقرير أمكن ربطه بشركة`,
  unmatchedNote: 'تعذر مطابقة سجل الملكية مع الشركة بدرجة كافية من الثقة',
  noResults: 'لا نتائج مطابقة.',
  noResultsHint: 'جرّب رمز الشركة أو جزءاً من اسمها.',
  loadFailed: 'تعذّر تحميل بيانات الملكية.',
  retry: 'إعادة المحاولة',

  /* ── The rebuilt pages (redesign) ──────────────────────────────────────
     Two sibling routes on the new site shell. Both read the SAME monthly
     filing, so the copy never says «مباشر» or «اليوم»: it names the month
     and it names how much of the report could be attached to a company. */
  page: {
    eyebrow: 'الأسواق',
    filing: (month: string) => `تقرير مركز الإيداع · ${month}`,
    searchLabel: 'بحث',
    clearSearch: 'مسح',
    showMore: (n: string) => `عرض ${n} إضافية`,
    showing: (shown: string, total: string) => `${shown} من ${total}`,
    tableCaption: 'ترتيب تنازلي حسب النسبة',
    empty: 'تعذّر قراءة تقرير الإيداع. حاول لاحقاً.',
    noMatch: 'لا نتائج مطابقة.',
    noMatchHint: 'جرّب رمز الشركة أو جزءاً من اسمها.',
    coverage: (matched: string, total: string) => `${matched} من ${total} اسم في التقرير أمكن ربطه بشركة. نعرض ما أمكن إثباته فقط، ولا نخمّن.`,
  },

  /* ── الملكية الأجنبية ─────────────────────────────────────────────────── */
  own: {
    title: 'الملكية الأجنبية',
    lede: 'من يملك رأس المال المودع في الشركات المدرجة: حصة المستثمر العراقي وحصة المستثمر الأجنبي، من آخر تقرير شهري لمركز الإيداع العراقي.',
    headline: 'حصة الأجانب من الأسهم المودعة',
    iraqiShare: 'عراقيون',
    foreignShare: 'أجانب',
    figures: {
      companies: 'شركة في التقرير',
      foreignShares: 'سهم بملكية أجنبية',
      holders: 'حامل سهم أجنبي',
      matched: 'شركة أمكن ربطها',
    },
    tableTitle: 'الشركات ذات الملكية الأجنبية',
    tableNote: (shown: string) => `${shown} شركة أمكن ربط سجلّها وتحمل ملكية أجنبية في هذا الشهر`,
    search: 'ابحث برمز الشركة أو باسمها',
    cols: { company: 'الشركة', pct: 'نسبة الملكية الأجنبية', shares: 'أسهم بملكية أجنبية', holders: 'حملة أجانب' },
    none: 'لا تتوفر بيانات ملكية موثوقة لهذا الشهر.',
    about: {
      title: 'عن هذه الأرقام',
      body: [
        'مركز الإيداع العراقي يحفظ أسهم الشركات المدرجة إلكترونياً، وينشر شهرياً جدولاً يبيّن كم من رأس مال كل شركة مودع باسم مستثمرين عراقيين وكم باسم مستثمرين أجانب. هذه الصفحة تقرأ آخر جدول متاح، لا أكثر: فهي صورة شهرية وليست رقماً متحركاً مع الجلسة.',
        'الأرقام هي أسهم مودعة، لا أسهم متداولة. الشركة قد تكون ملكيتها الأجنبية مرتفعة وتداولها اليومي شبه معدوم، والعكس صحيح — لذلك تُقرأ هذه الصفحة إلى جانب التدفق الأجنبي لا بدلاً منه.',
        'التقرير مطبوع ولا يحمل عمود رمز، فنطابق اسم الشركة مع سجلّ الشركات المدرجة. المجاميع في الأعلى محسوبة من كل سطر في التقرير لأن الجمع لا يحتاج اسماً؛ الجدول يعرض الشركات التي أمكن إثبات سجلّها فقط، والباقي متروك دون تخمين.',
      ],
    },
  },

  /* ── كبار المساهمين ───────────────────────────────────────────────── */
  holders: {
    title: 'كبار المساهمين',
    lede: 'أكبر الحصص المُفصح عنها في الشركات المدرجة، باسم كل مساهم ونسبة ملكيته، من آخر تقرير شهري لمركز الإيداع العراقي.',
    headline: 'أكبر حصة مُفصح عنها',
    figures: {
      stakes: 'حصة مُفصح عنها',
      companies: 'شركة لديها إفصاح',
      over50: 'حصة تتجاوز نصف رأس المال',
      matched: 'شركة أمكن ربطها',
    },
    tableTitle: 'الحصص المُفصح عنها',
    tableNote: (shown: string) => `${shown} حصة في شركات أمكن ربط سجلّها`,
    search: 'ابحث عن شركة أو مساهم',
    cols: { holder: 'المساهم', company: 'الشركة', pct: 'نسبة الملكية' },
    none: 'لا تتوفر بيانات مساهمين موثوقة لهذا الشهر.',
    nationality: 'يسجّل المصدر جنسية عراقية لكل حصة مُفصح عنها في هذا الشهر.',
    about: {
      title: 'عن هذه الأرقام',
      body: [
        'يُفصح مركز الإيداع شهرياً عن كبار المساهمين في كل شركة مدرجة: اسم المساهم ونسبة ما يملكه من رأس المال. الحصة الكبيرة تعني أن جزءاً من أسهم الشركة غير معروض للتداول عملياً، وأن قرار الشركة يميل إلى من يملكها.',
        'أسماء المساهمين تُعرض كما وردت في التقرير بالضبط. المساهم شخص أو كيان قانوني، وتهجئة التقرير هي السجل الوحيد لاسمه، فلا نترجمها ولا نطابقها ولا نصحّحها — حتى في النسخة الإنجليزية.',
        'لا تعرض الصفحة تغيّر النسبة عن الشهر السابق: الحقل موجود في المصدر لكن معظم قيمه صفر أو فارغ، ولا يمكن تمييز الصفر الحقيقي من الصفر الافتراضي، فحذفه أصدق من عرضه.',
      ],
    },
  },
}
