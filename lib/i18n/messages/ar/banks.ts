/**
 * /banks and /banks/[slug].
 *
 * ── The state vocabulary is the product ───────────────────────────────────
 * Most fields on most Iraqi banks are not published. Rendering all of them as
 * «—» would say the same thing about four different situations, so each has
 * its own words: the bank publishes it, the bank does not publish it, we could
 * not read the source, or nobody has looked. The page is only trustworthy if
 * those stay apart.
 */
export const banks = {
  title: 'المصارف العراقية',
  betaNotice: 'هذه الصفحة قيد البحث والتطوير. المعلومات تُراجع وتُحدَّث باستمرار، وقد تكون غير مكتملة.',
  standfirst: 'ما ينشره كل مصرف فعلاً، وتقييمنا حيث توفرت المعلومات.',
  breadcrumb: 'المصارف',

  /* Sector overview */
  totalBanks: 'مصارف في قاعدة البيانات',
  listedBanks: 'مدرجة في البورصة',
  withProducts: 'تنشر شروط منتجاتها',
  islamicBanks: 'مصارف إسلامية',

  /* Table */
  colBank: 'المصرف',
  colType: 'النوع',
  colListed: 'الإدراج',
  colAssets: 'الموجودات',
  colDeposits: 'ودائع العملاء',
  colProducts: 'المنتجات المنشورة',
  colCoverage: 'ما نشرَه المصرف',
  listed: 'مدرج',
  notListed: 'غير مدرج',

  type: {
    commercial: 'تجاري',
    islamic: 'إسلامي',
    investment: 'استثماري',
    specialised: 'متخصص',
    central: 'مركزي',
  },
  ownership: { state: 'حكومي', private: 'خاص', mixed: 'مختلط', foreign: 'أجنبي' },
  ownershipAdj: { state: 'حكومي', private: 'خاص', mixed: 'مختلط', foreign: 'فرع أجنبي' },
  typeAdj: { commercial: 'تجاري', islamic: 'إسلامي', investment: 'استثماري', specialised: 'متخصص', central: 'مركزي' },

  /* Coverage — a description of what was found, never a score */
  coverage: {
    rich: 'شروط منشورة بالتفصيل',
    partial: 'شروط منشورة جزئياً',
    'named-only': 'منتجات مسمّاة بلا أرقام',
    none: 'لا منتجات منشورة',
    unreachable: 'تعذّر الوصول إلى المصدر',
  },
  coverageNote: 'يصف هذا العمود ما ينشره المصرف علناً، لا جودته. مصرفٌ لا ينشر شروطه ليس بالضرورة مصرفاً أسوأ.',

  /* Filters */
  searchPlaceholder: 'ابحث عن مصرف',
  noMatch: 'لا يوجد مصرف مطابق',
  productsLabel: 'المنتجات',
  glance: 'أبرز ما ينشره المصرف',

  // hub · counts that are deliberately different from one another
  entriesLabel: 'مصرفاً في دليل البنك المركزي',
  operatingLabel: 'بلا ملاحظة في الدليل',
  publishingLabel: 'تنشر شروط منتجاتها',
  countsNote: 'دليل البنك المركزي يضم 79 قيداً، وهو ليس عدد المصارف العاملة: منها ما هو تحت التصفية أو الوصاية أو لم يبدأ العمل. و«بلا ملاحظة في الدليل» تعني أن الدليل لا يسجل قيداً على المصرف، لا أننا تحققنا من أنه يعمل.',

  // hub table
  colStatus: 'الحالة',
  colCategories: 'المنتجات المنشورة',
  colServices: 'الخدمات',
  colUpdated: 'آخر تحقق',
  catDeposits: 'ودائع',
  catLoans: 'قروض وتمويل',
  filterForeign: 'فروع أجنبية',
  filterPublishing: 'تنشر شروطاً',
  showingOf: (n: string, total: string) => `${n} من ${total}`,

  // status · four independent dimensions
  /* The directory's own annotation. `operating` means only that the CBI
     directory carries NO restriction annotation against the entry — not that
     we verified the bank is open for business. */
  status: {
    operating: 'لا ملاحظة في الدليل',
    establishment: 'تحت التأسيس',
    guardianship: 'تحت الوصاية',
    liquidation: 'تحت التصفية',
  },
  statusNote: {
    establishment: 'قيد في دليل البنك المركزي لم يبدأ أعماله بعد.',
    guardianship: 'مدرج في دليل البنك المركزي تحت وصاية أو حجز قضائي. لم نتحقق من توفر المنتجات المنشورة فعلياً.',
    liquidation: 'مدرج في دليل البنك المركزي تحت التصفية. لم نتحقق من نطاق الخدمات المتاحة حالياً.',
  },
  usdRestricted: 'قيود على التعامل بالدولار',
  usdRestrictedNote: 'مقيَّد التعامل بالدولار الأمريكي حسب القيود المنشورة. وجود حساب بالدولار لا يعني إمكانية إجراء كل التحويلات الدولارية.',

  // profile
  intro: 'نبذة',
  aboutBank: 'عن المصرف',
  headlineOne: 'سعر واحد مختار',
  otherTermsDiffer: 'شروط أخرى بأسعار مختلفة',
  ratePickedNote: 'يُعرض سعر واحد لكل منتج: السيناريو الاعتيادي للأفراد كما نشره المصرف، مع شروطه.',
  noCurrentRate: 'لا توجد نسبة حالية منشورة',
  datedRate: (rate: string, date: string) => `المصرف ينشر ${rate}% على صفحة صادرة في ${date}، ولم يُعد تأكيدها بعد ذلك.`,
  noRatePublished: 'لم ينشر المصرف سعراً يمكن عرضه',
  verifiedShort: (d: string) => `تحقق ${d}`,
  sourceCount: (n: string) => (n === '1' ? 'مصدر واحد' : n === '2' ? 'مصدران' : Number(n) <= 10 ? `${n} مصادر` : `${n} مصدراً`),
  linkedCompany: 'صفحة الشركة في البورصة',
  notResearchedNote: 'لم يُجرَ بحث منشور لهذا المصرف بعد؛ الصفحة تعرض قيد الدليل فقط.',
  filterRated: 'مقيّمة',
  filterAll: 'الكل',
  filterListed: 'مدرجة',
  filterState: 'حكومية',
  filterPrivate: 'خاصة',
  filterIslamic: 'إسلامية',
  filterGroup: 'تصفية',

  /* Profile */
  identity: 'التعريف',
  founded: 'التأسيس',
  hq: 'المقر',
  /* The city is stored once, in Arabic, because that is how the banks write
     it. The English page needs a name too, so it is translated here rather
     than duplicated into a second database column. */
  city: { 'بغداد': 'بغداد', 'أربيل': 'أربيل', 'البصرة': 'البصرة' } as Record<string, string>,
  website: 'الموقع',
  swift: 'سويفت',
  licence: 'مرخّص من البنك المركزي',
  tickerLabel: 'رمز السهم',
  viewCompany: 'صفحة السهم والبيانات المالية',

  financials: 'لمحة مالية',
  financialsNote: (year: string, period: string) => `من إفصاحات البورصة · ${year} ${period}`,
  fin: {
    total_assets: 'إجمالي الموجودات',
    customer_deposits: 'ودائع العملاء',
    total_equity: 'حقوق الملكية',
    net_income: 'صافي الدخل',
    paid_capital: 'رأس المال المدفوع',
    capital_adequacy_ratio: 'كفاية رأس المال',
    lcr: 'نسبة تغطية السيولة',
  },

  services: 'الخدمات',
  service: {
    atm: 'صراف آلي',
    mobile_banking: 'تطبيق الهاتف',
    internet_banking: 'الخدمات عبر الإنترنت',
    cards: 'البطاقات',
    usd_account: 'حساب بالدولار',
    international_transfer: 'حوالات خارجية',
    salary_domiciliation: 'توطين الراتب',
  },
  available: 'متوفّرة',
  unavailable: 'غير متوفّرة',
  unchecked: 'لم يُتحقق',

  deposits: 'الودائع والتوفير',
  loans: 'القروض والتمويل',
  noProducts: 'لا منتجات منشورة',

  /* The four states, in the reader's words */
  notPublished: 'لم ينشر المصرف هذه المعلومة',
  notPublishedShort: 'غير منشور',
  sourceUnavailable: 'تعذّر التحقق من المصدر',
  notChecked: 'لم يُتحقق بعد',
  notApplicable: 'لا ينطبق',

  rate: 'النسبة',
  rateRange: (from: string, to: string) => `${from}% – ${to}%`,
  /* Basis is part of the number. «8%» on a declining balance and «8%» flat
     are different prices, and an unstated basis must not be relabelled. */
  rateBasis: {
    reducing: 'بالقسط المتناقص',
    flat: 'بالقسط الثابت',
    annual: 'سنوياً',
    annual_from: 'سنوياً كحد أدنى معلن',
    declining: 'على الرصيد المتناقص',
    expected: 'ربح متوقع غير مضمون',
    total_margin: 'هامش ربح إجمالي للعقد',
    unstated: 'لم يحدد المصرف أساس الاحتساب',
  },
  amount: 'المبلغ',
  term: 'المدة',
  months: (n: string) => `${n} شهراً`,
  /* Arabic number agreement: one → سنة واحدة, two → سنتان, 3–10 → سنوات,
     eleven and above → سنة. «15 سنوات» is not Arabic. */
  years: (n: string) => {
    const v = Number(n)
    if (v === 1) return 'سنة واحدة'
    if (v === 2) return 'سنتان'
    return v >= 3 && v <= 10 ? `${n} سنوات` : `${n} سنة`
  },
  conditionsApply: 'بشروط',
  conditionsHeading: 'الشروط',
  showConditions: 'عرض الشروط',
  dependsOn: 'تختلف حسب الشروط أدناه',

  condField: {
    salary: 'الراتب',
    salary_domiciled: 'الراتب موطَّن لدى المصرف',
    employment_type: 'نوع الوظيفة',
    employment_months: 'مدة الخدمة',
    age: 'العمر',
    has_guarantor: 'كفيل',
    has_collateral: 'ضمان',
    collateral_type: 'نوع الضمان',
    purpose: 'الغرض',
    deposit_amount: 'مبلغ الوديعة',
    term_months: 'المدة',
  },
  condOp: { eq: '=', ne: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤', in: 'من', not_in: 'ليس من' },
  /* A negated boolean needs its own words. «≠ الراتب موطَّن لدى المصرف» is not
     Arabic; «الراتب غير موطَّن لدى المصرف» is what the condition actually says. */
  condFieldNo: {
    salary_domiciled: 'الراتب غير موطَّن لدى المصرف',
    has_guarantor: 'بدون كفيل',
    has_collateral: 'بدون ضمان',
  } as Record<string, string>,
  condValue: {
    true: 'نعم', false: 'لا',
    government: 'حكومي', private: 'خاص', mixed: 'مختلط', self_employed: 'عمل حر', retired: 'متقاعد',
    vehicle_lien: 'حجز السيارة', property: 'عقار', gold: 'ذهب', deposit: 'وديعة', mastercard: 'ماستر كارد',
    purchase: 'شراء', build: 'بناء', renovate: 'ترميم', land: 'أرض', vehicle: 'سيارة', business: 'مشروع', personal: 'شخصي',
  },

  sources: 'المصادر والتحقق',
  verifiedOn: (d: string) => `تُحقق في ${d}`,
  sourceIs: 'المصدر',
  couldNotVerify: 'ما تعذّر التحقق منه',
  unreachableNote: 'موقع المصرف غير متاح من خارج العراق، فلا توجد شروط منتجات موثّقة هنا. غياب المعلومة هنا لا يعني غيابها لدى المصرف.',
  methodology: 'كل رقم على هذه الصفحة مأخوذ من مصدر المصرف نفسه، مع تاريخ التحقق. ما لا ينشره المصرف يُذكر كذلك صراحةً بدل تركه فارغاً.',

  /* ── SEO copy ──────────────────────────────────────────────────────────
     Titles and descriptions are generated for 79 pages, so the sentence
     shapes live here as functions rather than as string concatenation in
     lib/bankSeo.ts — where they were, and where the i18n gate correctly
     refused them. No rate ever appears in a title or a description: a rate in
     a snippet is a promise to keep it current, and nothing reverifies 79
     banks on Google's crawl schedule. */
  seo: {
    titleLiquidation: (n: string) => `${n} · مصرف تحت التصفية`,
    titleGuardianship: (n: string) => `${n} · مصرف تحت الوصاية`,
    titleBoth: (n: string) => `${n} · الودائع والقروض وشروطها`,
    titleDeposits: (n: string) => `${n} · الودائع وشروطها`,
    titleLoans: (n: string) => `${n} · القروض والتمويل وشروطها`,
    titleProfile: (n: string) => `${n} · بيانات المصرف وخدماته`,
    descKind: (type: string, own: string) => `مصرف ${type} ${own}`,
    descCity: (city: string) => `في ${city}`,
    descListed: (ticker: string) => `مدرج في بورصة العراق برمز ${ticker}`,
    descHead: (name: string, bits: string) => `${name}: ${bits}.`,
    descLiquidation: (head: string) => `${head} مدرج في دليل البنك المركزي تحت التصفية.`,
    descGuardianship: (head: string) => `${head} مصرف تحت الوصاية حسب دليل البنك المركزي.`,
    descTerms: (head: string, products: string, services: string) =>
      `${head} ${products}${services} — مع المصدر وتاريخ التحقق.`,
    descProducts: (n: string) => (n === '1' ? 'منتج واحد بشروط منشورة' : `${n} منتجات بشروط منشورة`),
    descServices: (n: string) => ` و${n} خدمات موثّقة`,
    descNoTerms: (head: string) => `${head} لا ينشر المصرف شروط منتجاته علناً؛ الصفحة تعرض ما تم التحقق منه فقط.`,
    join: '، ',
  },
  /* The factual sentence under the name, assembled from typed fields. */
  introKind: (type: string, own: string) => `مصرف ${type} ${own}`,
  introCity: (city: string) => `ومقره ${city}`,
  introFounded: (year: string) => `تأسس عام ${year}`,
  introListed: (ticker: string) => `ومدرج في بورصة العراق برمز ${ticker}`,
  introLicensed: 'ومرخّص من البنك المركزي العراقي',
  introJoin: '، ',
  /* ── Editorial layer · plain words, one per idea ─────────────────────── */
  ed: {
    verdict: 'الخلاصة',
    suitableFor: 'يناسب',
    watchOut: 'انتبه',
    coverage: {
      overall: 'تقييم أولي',
      partial: 'تقييم جزئي',
      products: 'بلا تقييم',
      limited: 'معلومات محدودة',
    },
    ratings: 'التقييم',
    ratingsWhat: 'تقييم تحريري من مصادر منشورة، لا يقيس أمان المصرف.',
    overallLine: (n: string) => `يشمل ${n} محاور من 6 — الدعم غير مقيّم`,
    partialLine: (n: string) => `${n} من 6 محاور فقط`,
    notRated: 'غير مقيّم',
    notRatedLine: 'لا تكفي المعلومات المتاحة لتقييم هذا المصرف.',
    why: 'لماذا هذه الدرجات؟',
    confidence: { low: 'ثقة منخفضة', medium: 'ثقة متوسطة', high: 'ثقة عالية', limited: 'ثقة محدودة', insufficient: 'معلومات غير كافية' },
    category: {
      mobile: 'التطبيق',
      support: 'الدعم',
      fees: 'الرسوم',
      payments: 'البطاقات والتحويل',
      access: 'فتح الحساب',
      products: 'المنتجات',
    },
    methodology: 'طريقة التقييم',
    products: 'المنتجات',
    noRateSelected: 'بلا نسبة معلنة',
    basis: {
      annual: 'سنوياً',
      annual_from: 'سنوياً، يبدأ من',
      annual_declining: 'سنوياً على الرصيد المتناقص',
      declining_unannualized: 'على الرصيد المتناقص',
      expected_profit_not_guaranteed: 'ربح متوقع غير مضمون',
      financing_return_only: 'عائد التمويل فقط',
      unstated: 'الأساس غير موضح',
      flat: 'بالقسط الثابت',
    },
    ratesFoot: 'النسب كما نشرها المصرف، ولم نتأكد منها مباشرة.',
    detailsToggle: 'الشروط',
    fees: 'الرسوم',
    experience: 'الخدمات والتطبيق',
    official: 'الخدمات المعلنة',
    app: 'التطبيق',
    appLink: 'رابط التطبيق',
    reportedFoot: 'من عينة تقييمات على المتجر، وليست تجارب مؤكدة.',
    noVerifiedServices: 'لم نتأكد من خدمات معلنة.',
    noExperience: 'لا توجد معلومات كافية عن التجربة.',
    faqs: 'أسئلة شائعة',
    links: 'روابط',
    sourcesToggle: (n: string) => `المصادر (${n})`,
    editorialNotice: 'ملف تحريري من مصادر منشورة، وليس اعتماداً من المصرف.',
    colRating: 'التقييم',
    colProduct: 'المنتج',
    colRate: 'النسبة',
    hubFoot: 'دليل البنك المركزي يضم 79 قيداً، منها مصارف تحت التصفية أو الوصاية أو لم تبدأ العمل. التقييم تحريري ولا يشمل كل المصارف.',
    arabicLink: 'النسخة العربية',
    arabicOnly: 'الملاحظات التحريرية متاحة بالعربية.',
  },
  notFound: 'لا يوجد مصرف بهذا الاسم',
  backToBanks: 'كل المصارف',
  /* ── /banks · the hub, rebuilt (site/BanksPage) ───────────────────────── */
  hub: {
    eyebrow: 'البنوك والتمويل',
    title: 'المصارف العراقية',
    note: 'كل مصرف في دليل البنك المركزي العراقي: نوعه وملكيته وحالته في الدليل، إن كان مدرجاً في البورصة، وما ينشره فعلاً عن ودائعه وقروضه وخدماته. الأرقام من مصادر المصارف نفسها ومن إفصاحات البورصة، مع تاريخ التحقق.',
    rail: { banks: 'المصارف', deposits: 'الودائع', loans: 'القروض والتمويل', cards: 'البطاقات والتطبيقات' },
    soon: 'قريباً',
    counts: { total: 'مصرفاً في دليل البنك المركزي', listed: 'مدرجاً في البورصة', usd: 'مقيّداً بالدولار', guardianship: 'تحت الوصاية أو التصفية', publishing: 'ينشر شروط منتجاته' },
    depositsTitle: 'أعلى فوائد الودائع لأجل المنشورة',
    depositsNote: 'كما ينشرها كل مصرف على موقعه، للأفراد وبالدينار ما لم يُذكر غير ذلك. النسبة سنوية؛ لدى المصارف الإسلامية ربح متوقع غير مضمون.',
    perYear: 'سنوياً',
    expected: 'ربح متوقع',
    months: (n: string) => `${n} شهراً`,
    search: 'ابحث عن مصرف',
    filters: { all: 'الكل', commercial: 'تجارية', islamic: 'إسلامية', investment: 'استثمارية', listed: 'مدرجة', state: 'حكومية', foreign: 'أجنبية', publishing: 'تنشر شروطاً' },
    sort: 'الترتيب',
    sorts: { assets: 'الموجودات', name: 'الاسم', rating: 'التقييم' },
    cols: { bank: 'المصرف', type: 'النوع', ownership: 'الملكية', status: 'الحالة', ticker: 'السهم', publishes: 'ينشر', assets: 'الموجودات', rating: 'التقييم' },
    status: { operating: 'عامل', establishment: 'تحت التأسيس', guardianship: 'وصاية', liquidation: 'تصفية' },
    usdShort: 'قيود دولار',
    usdLong: 'مقيّد التعامل بالدولار الأمريكي',
    pub: { deposits: 'ودائع', loans: 'قروض', services: 'خدمات', none: 'لا شيء منشور', unreachable: 'موقعه غير متاح', unresearched: 'لم يُبحث بعد' },
    notListed: 'غير مدرج',
    noAssets: '—',
    assetsNote: (y: string) => `إفصاح ${y}`,
    notRated: 'غير مقيّم',
    shown: (n: string, total: string) => `${n} من ${total} مصرفاً`,
    noMatch: 'لا مصرف يطابق البحث',
    about: {
      title: 'عن هذه الأرقام',
      body: [
        'القائمة هي دليل البنك المركزي العراقي بقيوده الـ79، وهو ليس عدد المصارف العاملة فعلاً: منها ما هو تحت الوصاية أو التصفية أو لم يبدأ العمل، والحالة المعروضة هي حالة الدليل لا تحقّقنا نحن. «عامل» تعني أن الدليل لا يسجّل ملاحظة على المصرف.',
        'القيود على التعامل بالدولار الأمريكي من القوائم المنشورة، ووجود حساب بالدولار لدى مصرف مقيّد لا يعني إمكانية إجراء كل التحويلات.',
        'عمود «ينشر» يصف ما نشره المصرف علناً على موقعه، لا جودته: مصرف لا ينشر شروطه ليس بالضرورة مصرفاً أسوأ، ومصرف تعذّر فتح موقعه من خارج العراق يُذكر كذلك بدل أن يُعدّ صامتاً.',
        'الموجودات من آخر إفصاح مالي للمصارف المدرجة في بورصة العراق، وهي الصفوف نفسها التي تعرضها صفحة القوائم المالية للشركة. التقييم تحريري من مصادر منشورة ولا يقيس أمان المصرف.',
      ],
    },
  },
  /* ── /banks/[slug] · the profile, rebuilt (site/BankProfilePage) ──────── */
  profile: {
    back: 'المصارف',
    identity: { type: 'النوع', ownership: 'الملكية', founded: 'التأسيس', hq: 'المقر', ticker: 'السهم', website: 'الموقع', swift: 'سويفت', status: 'حالة الدليل' },
    editorialTitle: 'الخلاصة',
    ratingsTitle: 'التقييم',
    productsTitle: 'المنتجات المنشورة',
    productsNote: 'لكل منتج نسبة واحدة: السيناريو الاعتيادي للأفراد كما نشره المصرف، مع شروطه. ما لم ينشره المصرف يُذكر كذلك بدل تركه فارغاً.',
    servicesTitle: 'الخدمات',
    servicesNote: 'كما يعلنها المصرف على موقعه، مع تاريخ التحقق. «لم يُتحقق» تعني أننا لم نجد إعلاناً لا أن الخدمة غير موجودة.',
    finTitle: 'لمحة مالية',
    finLink: 'القوائم المالية كاملة',
    faqsTitle: 'أسئلة شائعة',
    linksTitle: 'روابط المصرف',
    sourcesTitle: (n: string) => `المصادر (${n})`,
    aboutTitle: 'عن هذه الصفحة',
    aboutBody: [
      'كل رقم على هذه الصفحة مأخوذ من مصدر المصرف نفسه أو من إفصاحاته في البورصة، مع تاريخ التحقق. ما لا ينشره المصرف يُذكر كذلك صراحةً بدل تركه فارغاً.',
      'النسب كما نشرها المصرف على موقعه ولم نتأكد منها مباشرة؛ الرقم الذي نشره المصرف قبل أكثر من سنة يبقى على الصفحة بتاريخه ولا يُعرض كعرض حالي.',
      'التقييم تحريري من مصادر منشورة — موقع المصرف، متجر التطبيقات، وما يكتبه المستخدمون — ولا يقيس أمان المصرف ولا هو اعتماد منه.',
    ],
  },
}
