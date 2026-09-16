/**
 * /pulse — نبض السوق.
 *
 * ── The classification is a RULE, not a score ─────────────────────────────
 * Each verdict's `rule` is a function taking the three thresholds the code
 * actually tests — BROAD, WEAK and SKEW — so neither language can quote a
 * number the calculation does not use. That guarantee used to come from
 * building the sentence inside `verdict()`; moving the copy out must not cost
 * it. Nothing here may become marketing: the page's whole claim is that you
 * can check its arithmetic.
 *
 * ── Four states, and the fourth is not «flat» ─────────────────────────────
 * رابح / ثابت / خاسر / بلا مقارنة. The fourth means a company that TRADED but
 * has no comparable prior close — it has no direction at all, so it is
 * excluded from every ratio rather than counted as unchanged.
 *
 * ── «قابلة للقياس» is the denominator that matters ────────────────────────
 * Every share statistic on this page divides by the COMPARABLE count, not the
 * traded count. Saying so once, plainly, is what keeps the percentages
 * honest.
 */
export const pulse = {
  title:   'نبض السوق',
  sessionOf: (d: string) => `جلسة ${d}`,
  allShares: 'كل الأسهم',

  noSessionTitle: 'لم تُنشر بيانات جلسة بعد',
  noSessionNote:  'تُحتسب مؤشرات الاتساع من النشرة الرسمية بعد إغلاق الجلسة.',
  failedTitle: 'تعذّر تحميل بيانات الجلسة',
  failedNote:  'يمكن إعادة المحاولة، أو العودة إلى صفحة السوق.',
  retry: 'إعادة المحاولة',

  showRule: 'عرض قاعدة التصنيف',
  hideRule: 'إخفاء قاعدة التصنيف',
  ruleWord: 'القاعدة',

  upByCount:  'صاعد من العدد',
  upByVolume: 'صاعد من الحجم',
  ofComparable: (up: string, total: string) => `${up} من ${total} قابلة للقياس`,
  sharesUnit: 'سهم',

  breadthVsLiquidity: 'الاتساع والسيولة',
  adRatio: (r: string) => `نسبة الصاعد للهابط ${r} : 1`,
  noRatio: 'لا يمكن حساب النسبة لعدم وجود شركات خاسرة',

  up: 'رابح',
  flat: 'ثابت',
  down: 'خاسر',
  noPrior: 'بلا مقارنة',
  noPriorLong: 'بلا إغلاق سابق',
  onRising: 'على الصاعدة',
  onFalling: 'على الهابطة',
  traded: 'متداولة',

  skewAligned: 'حصة الأسهم الصاعدة من الحجم تقارب حصتها من العدد — حركة متسقة.',
  skewWith: (pts: string) => `الأسهم الصاعدة تستحوذ على حصة من الحجم تفوق حصتها من العدد بـ${pts} نقطة مئوية — السيولة مع الاتجاه.`,
  skewAgainst: (pts: string) => `الأسهم الصاعدة تستحوذ على حصة من الحجم تقل عن حصتها من العدد بـ${pts} نقطة مئوية — الارتفاع أوسع مما هو مدعوم.`,
  noPriorNote: (n: string, plural: boolean) =>
    `${n} ${plural ? 'شركات' : 'شركة'} تداولت في هذه الجلسة دون إغلاق سابق قابل للمقارنة، فلا اتجاه لها.`,

  participation: 'المشاركة',
  tradedOfListed: (listed: string) => `شركة تداولت من أصل ${listed} مدرجة`,
  tradedNoListed: 'شركة تداولت',
  tradedValue: 'القيمة المتداولة',
  tradeCount:  'عدد الصفقات',
  highsLows:   'قمم / قيعان 52 أسبوعاً',
  listed:      'المدرجة',
  prevSession: 'الجلسة السابقة',
  difference:  'الفرق',
  points:      'نقطة',
  participationLabel: (pct: string, traded: string, listed: string) =>
    `${pct} بالمئة مشاركة · ${traded} من ${listed}`,

  verdictLabel: 'خلاصة الجلسة',
  timeframe: 'المدة',
  /* «صعود واسع، مدعوم بحصة سيولة…» — the comma belongs to the language, not
     to the layout, so it lives here rather than in the JSX. */
  verdictJoin: (headline: string, qualifier: string) => `، ${qualifier}`,

  subhead: 'اتساع السوق والمشاركة تحت مستوى المؤشر',
  ratioDash: 'نسبة الصاعد للهابط',
  noRatioHelp: 'لا يمكن حساب النسبة لعدم وجود شركات خاسرة في الجلسة.',
  countField: 'عدد الشركات المتداولة',
  countUnit:  'شركة',
  volumeField:'حجم التداول الاتجاهي',
  volumeTotalLabel: 'حجم اتجاهي',
  noPriorTail: ' وهي معروضة منفصلة ولم تُحتسب ثابتة، ولا تدخل في حصص العدد أعلاه.',
  vsPrevSession: 'مقابل الجلسة السابقة',
  companySuffix: ' شركة',
  tradedGap: (index: string, rows: string) =>
    `نشرة الجلسة تذكر ${index} شركة متداولة، وسجل الأسعار يحمل ${rows} صفاً. الأرقام أعلاه محسوبة من سجل الأسعار.`,
  advMinusDec: 'الصاعدة ناقص الهابطة',
  netBreadthHelpLong:
    'صافي الاتساع = عدد الشركات المرتفعة ناقص عدد المنخفضة في الجلسة. سجل الجلسات السابقة يقارن كل شركة بآخر إغلاق تداولت فيه، لا بإغلاق الجلسة السابقة، ولذلك لا يفصل الشركات التي لا إغلاق سابق لها.',
  concentrationFoot:
    'الترتيب حسب قيمة التداول في الجلسة. لا تتوفر أوزان مكوّنات مؤشر ISX60 في البيانات، ولذلك لا تُعرض مساهمة الشركات في حركة المؤشر.',

  netBreadth: 'صافي الاتساع عبر الجلسات',
  netBreadthHelp: 'صافي الاتساع = عدد الشركات المرتفعة ناقص عدد المنخفضة',
  netBreadthWord: 'صافي الاتساع',
  pinnedHint: 'جلسة مثبّتة — انقر مرة أخرى للإلغاء',
  latestHint: (n: string) => `آخر جلسة في السجل · ${n} جلسة معروضة`,
  sessionBarLabel: (date: string, net: string, up: string, down: string) =>
    `${date}: صافي الاتساع ${net}، ${up} رابح، ${down} خاسر`,

  sectorBreadth: 'اتساع القطاعات',
  sectorNote:    'توزيع الشركات داخل كل قطاع، لا عائد القطاع',
  upToDown:      'رابح : خاسر',
  sectorHint:    'مرّر أو انقر على قطاع لعرض توزيعه · النقر يثبّته',
  sectorBarLabel: (label: string, up: string, flat: string, down: string, noPrior: string, traded: string) =>
    `${label}: ${up} رابح، ${flat} ثابت، ${down} خاسر، ${noPrior} بلا مقارنة، من ${traded} متداولة`,

  concentration: 'تركّز التداول',
  concentrationNote: 'من قيمة التداول، لا من حركة المؤشر',
  concentrationNA: 'لا تتوفر قيمة تداول الجلسة لاحتساب التركّز',
  concentrationTop: 'من قيمة تداول الجلسة جرت على 5 شركات فقط',
  ofSessionValue: 'من قيمة الجلسة',
  movement: 'الحركة',
  concentrationHint: 'مرّر على شركة لعرض حصتها · النقر يفتح صفحتها',
  companyValueLabel: (name: string, value: string) => `${name} · قيمة التداول ${value} دينار`,
  sliceLabel: (txt: string, pct: string) => `${txt} · ${pct} بالمئة`,

  /**
   * The verdicts. `rule` receives the live thresholds so the sentence and the
   * branch can never disagree.
   */
  verdict: {
    broadSupported: {
      headline: 'صعود واسع',
      qualifier: 'مدعوم بحصة سيولة تفوق حصة العدد',
      rule: (broad: string, _weak: string, skew: string) =>
        `تُوصف الجلسة بالاتساع الإيجابي عندما ترتفع أكثر من ${broad} من الشركات القابلة للقياس، ويُعدّ ميل السيولة واضحاً عندما يتجاوز الفرق بين حصة الأسهم الصاعدة من الحجم وحصتها من العدد ${skew} نقاط مئوية. تحقّق الشرطان معاً في هذه الجلسة، والميل لصالح الأسهم الصاعدة.`,
    },
    broadUnsupported: {
      headline: 'اتساع إيجابي',
      qualifier: 'لكن السيولة تميل إلى الأسهم الهابطة',
      rule: (broad: string, _weak: string, skew: string) =>
        `تُوصف الجلسة بالاتساع الإيجابي عندما ترتفع أكثر من ${broad} من الشركات القابلة للقياس، ويُعدّ ميل السيولة واضحاً عندما يتجاوز الفرق بين حصة الأسهم الصاعدة من الحجم وحصتها من العدد ${skew} نقاط مئوية. تحقّق الشرطان، إلا أن الميل جاء لصالح الأسهم الهابطة، ولذلك لا تُوصف الجلسة بصعود مدعوم.`,
    },
    broadNeutral: {
      headline: 'اتساع إيجابي',
      qualifier: 'دون ميل واضح في السيولة',
      rule: (broad: string, _weak: string, skew: string) =>
        `تُوصف الجلسة بالاتساع الإيجابي عندما ترتفع أكثر من ${broad} من الشركات القابلة للقياس. لم يتجاوز الفرق بين حصة الصاعدة من الحجم وحصتها من العدد ${skew} نقاط مئوية، فلا يُوصف الصعود بأنه مدعوم أو غير مدعوم.`,
    },
    weakSupported: {
      headline: 'ضعف واسع',
      qualifier: 'ومعظم حجم التداول على الأسهم الهابطة',
      rule: (_broad: string, weak: string, skew: string) =>
        `يُوصف الاتساع بالسلبي عندما تكون نسبة الشركات المرتفعة ${weak} أو أقل من القابلة للقياس، ويُعدّ ميل السيولة واضحاً عندما يتجاوز الفرق ${skew} نقاط مئوية. تحقّق الشرطان معاً، والميل لصالح الأسهم الهابطة.`,
    },
    weakNeutral: {
      headline: 'اتساع سلبي',
      qualifier: 'دون ميل واضح في السيولة',
      rule: (_broad: string, weak: string, skew: string) =>
        `يُوصف الاتساع بالسلبي عندما تكون نسبة الشركات المرتفعة ${weak} أو أقل من القابلة للقياس. لم يتجاوز الفرق بين حصة الصاعدة من الحجم وحصتها من العدد ${skew} نقاط مئوية.`,
    },
    balanced: {
      headline: 'جلسة متوازنة',
      qualifier: 'دون ميل واضح في الاتساع',
      rule: (broad: string, weak: string, _skew: string) =>
        `تُصنّف الجلسة متوازنة عندما تبقى حصة الشركات الصاعدة بين ${weak} و${broad} من القابلة للقياس، فلا تتحقّق شروط الاتساع الإيجابي ولا السلبي.`,
    },
  },

  /* ── The rebuilt page (redesign) ──────────────────────────────────────
     Designed fresh for the new identity. The MODEL is lib/pulse.ts and the
     verdict copy above is reused verbatim — both are the product's own
     thinking and neither is design. What is new is the composition: the
     verdict is the page's lead rather than a strip above a grid of panels,
     and the four comparisons become one table, because every one of them is
     already «two numbers compared» — which is what «one row, one fact» is
     for. */
  page: {
    eyebrow: 'الأسواق',
    lede: 'المؤشر يقول إلى أين تحرّك السوق. هذه الصفحة تقول إن كانت الحركة حقيقية: كم شركة شاركت فيها، وأين ذهب حجم التداول، وعلى كم سهم تقف الجلسة.',
    session: (date: string) => `جلسة ${date}`,
    because: (co: string, vol: string) => `${co} من الشركات صاعدة · ${vol} من حجم التداول عليها`,
    showRule: 'كيف وصلنا إلى هذه الخلاصة',
    noSession: 'لا تتوفر بيانات جلسة صالحة.',

    readings: 'قراءات الجلسة',
    cols: { reading: 'القراءة', pair: 'المقارنة', share: 'الحصة' },
    breadth: 'الاتساع',
    breadthA: (n: string) => `${n} صاعدة`,
    breadthB: (n: string) => `${n} هابطة`,
    liquidity: 'السيولة',
    liquidityA: (v: string) => `${v} على الأسهم الصاعدة`,
    liquidityB: (v: string) => `${v} على الأسهم الهابطة`,
    participation: 'المشاركة',
    participationA: (n: string) => `${n} شركة تداولت`,
    participationB: (n: string) => `من ${n} شركة مدرجة`,
    concentration: 'التركّز',
    concentrationA: (v: string) => `${v} في أكبر 5 شركات`,
    concentrationB: (v: string) => `من ${v} قيمة الجلسة`,
    flatNote: (n: string) => `${n} ثابتة`,
    noPriorNote: (n: string) => `${n} بلا قياس`,
    noPriorWhy: 'شركة تداولت اليوم ولم تتداول في الجلسة السابقة لا يمكن قياس اتجاهها، فلا نحسبها ثابتة ولا ندخلها في مقام أي نسبة هنا.',

    history: 'الاتساع عبر الجلسات',
    historyNote: 'الصاعدة ناقص الهابطة في كل جلسة، والخط التراكمي يجمعها منذ بداية المدة. المصدر هنا جدول الاتساع اليومي، وهو يقارن كل شركة بإغلاقها السابق هي لا بالجلسة السابقة.',
    timeframe: 'المدة',
    adLine: 'الخط التراكمي',
    adLineNote: 'مجموع صافي الاتساع منذ بداية المدة المختارة. صعوده يعني أن السوق يتّسع جلسة بعد جلسة، وهبوطه يعني العكس — حتى لو كان المؤشر يقول غير ذلك.',
    latest: 'آخر جلسة',

    sectors: 'اتساع القطاعات',
    sectorsNote: 'داخل كل قطاع: كم من شركاته صعدت وكم هبطت. الشركة التي لا يُعرف قطاعها تُترك خارج الجدول ولا تُخمّن.',
    sectorCols: { sector: 'القطاع', up: 'صاعدة', down: 'هابطة', flat: 'ثابتة', none: 'بلا قياس', traded: 'تداولت' },

    gap: (index: string, rows: string) => `نشرة البورصة تذكر ${index} شركة متداولة، ولدينا ${rows} صفاً لهذه الجلسة.`,

    about: {
      title: 'عن هذه الأرقام',
      body: [
        'المؤشر رقم واحد، ويمكن أن يرتفع لأن سهماً كبيراً واحداً ارتفع بينما هبط معظم السوق. هذه الصفحة تفكّك ذلك: تقيس كم شركة تحرّكت في كل اتجاه، وكم من حجم التداول وقف خلف كل اتجاه، وكم شركة شاركت أصلاً.',
        'القاعدة في كل سطر أن يكون رقمين مقارنين لا رقماً واحداً معروضاً. «صعدت ثماني شركات» لا تعني شيئاً وحدها؛ «ثماني شركات صعدت مقابل ثلاثين هبطت» تعني جلسة ضعيفة.',
        'الشركة التي تداولت اليوم ولم تتداول في الجلسة السابقة لا يمكن قياس اتجاهها، فلا نحسبها ثابتة. تظهر في خانة «بلا قياس» وتخرج من مقام كل نسبة على هذه الصفحة — لأن غياب القياس ليس صفراً.',
        'لا تعرض الصفحة مساهمة كل سهم في حركة المؤشر: ذلك يتطلب أوزان مكوّنات المؤشر، ولا نملكها. الرقم الذي لا يمكن حسابه لا يُعرض ولا يُلمّح إليه.',
      ],
    },
  },
}
