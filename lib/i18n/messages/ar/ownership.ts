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
}
