/**
 * `/learn/trading-from-zero` — the beginner guide's content.
 *
 * ══ THIS TEXT IS NOT REWRITTEN ════════════════════════════════════════════
 * Every title and body below is carried over VERBATIM from the live page at
 * `app/learn/trading-from-zero/page.tsx`. This is a presentation migration:
 * the editorial content is the owner's, and moving it into a module is the
 * only change — the page now needs the section list in two places (its own
 * body and the `/learn` path card's section count and reading time), and a
 * count typed by hand in a second file is a count that will drift.
 *
 * The guide is the product's ONLY real Learn article. WordPress category 4
 * holds zero posts; this page is not a CMS post and never was.
 */

export type GuideSection = { title: string; body: string }

/**
 * ⚠ ONE CORRECTION to the Arabic, and it is not a rewrite.
 *
 * Step 4 read «استخدم منصة IQWealth لمتابعة أسعار الأسهم مباشرة». The product
 * has no intraday feed — it publishes the last session's bulletin — and
 * «مباشرة» is precisely the claim the whole freshness system exists to
 * prevent. It now says «بعد كل جلسة». Nothing else in the owner's text was
 * touched.
 */
export const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: 'ما هي بورصة العراق للأوراق المالية؟',
    body: `بورصة العراق للأوراق المالية (ISX - Iraq Stock Exchange) هي السوق الرسمي لتداول أسهم الشركات العراقية المدرجة. تأسست عام 2004 وتضم أكثر من 100 شركة مدرجة في قطاعات متعددة: المصارف، الصناعة، الاتصالات، الاستثمار، التأمين، والزراعة.

يُقاس أداء السوق بشكل عام عبر مؤشر ربيع للأوراق المالية (RSISX)، الذي يتتبع أداء الأسهم المدرجة ويعكس صحة الاقتصاد العراقي.`,
  },
  {
    title: 'الفرق بين التداول والاستثمار',
    body: `التداول (Trading): شراء وبيع الأسهم في فترات قصيرة (أيام أو أسابيع) بهدف الاستفادة من تذبذب الأسعار. يتطلب متابعة يومية وخبرة في قراءة المخططات.

الاستثمار (Investing): شراء أسهم والاحتفاظ بها لسنوات بهدف تنمية رأس المال وتحقيق عوائد على المدى البعيد. يناسب المبتدئين أكثر من التداول النشط.

للمبتدئين، يُنصح بالبدء بعقلية المستثمر طويل الأمد قبل الانتقال للتداول النشط.`,
  },
  {
    title: 'كيف تبدأ في بورصة العراق؟',
    body: `الخطوة 1 · اختر شركة وساطة مرخصة:
تحتاج إلى فتح حساب لدى شركة وساطة مالية مرخصة من هيئة الأوراق المالية العراقية. تتوفر عدة شركات وساطة معتمدة في بغداد والمحافظات.

الخطوة 2 · أودع رأس المال:
لا يوجد حد أدنى قانوني، لكن يُنصح البدء بمبلغ لا تتحمل خسارته أثناء مرحلة التعلم.

الخطوة 3 · اختر الأسهم:
ابدأ بدراسة أسهم الشركات التي تعرفها · المصارف الكبيرة، شركات الاتصالات، الشركات الصناعية الراسخة.

الخطوة 4 · تابع السوق:
استخدم منصة IQWealth لمتابعة أسعار الأسهم بعد كل جلسة، وقراءة الأخبار، ومشاهدة المخططات.`,
  },
  {
    title: 'كيف تقرأ سعر السهم؟',
    body: `سعر الإغلاق (Close): آخر سعر تم تداول السهم به في جلسة التداول.

التغيير اليومي: الفرق بين سعر اليوم وسعر الأمس · الرقم الأخضر يعني ارتفاعاً، الأحمر يعني انخفاضاً.

حجم التداول (Volume): عدد الأسهم المتداولة في الجلسة · الحجم الكبير يعني اهتماماً أكبر بالسهم.

القيمة السوقية (Market Cap): إجمالي قيمة الشركة = عدد الأسهم × سعر السهم.

مكرر الربح (P/E): مقياس لغلاء أو رخص السهم مقارنةً بأرباح الشركة. كلما كان أقل، كلما كان السهم أرخص نسبياً.`,
  },
  {
    title: 'قطاعات بورصة العراق',
    body: `تنقسم الشركات المدرجة في بورصة العراق إلى عدة قطاعات رئيسية:

• القطاع المصرفي: الأكبر والأكثر سيولة · يضم أكثر من 40 مصرفاً تجارياً وإسلامياً.
• قطاع الاتصالات: يضم شركات كبيرة مثل آسياسيل والخاتم للاتصالات.
• القطاع الصناعي: شركات الأغذية والمشروبات والمواد الإنشائية.
• قطاع الاستثمار: شركات تُدير محافظ استثمارية متنوعة.
• قطاع الفنادق والسياحة.
• قطاع التأمين.`,
  },
  {
    title: 'نصائح للمبتدئ في بورصة العراق',
    body: `1. لا تستثمر أكثر مما تستطيع تحمّل خسارته
الأسواق تتذبذب، والخسائر جزء طبيعي من الاستثمار. استثمر فقط ما هو فائض عن حاجتك اليومية.

2. تنوّع في القطاعات
لا تضع كل أموالك في قطاع واحد. وزّع استثماراتك بين المصارف والاتصالات والصناعة.

3. فكّر على المدى البعيد
أسعار بورصة العراق تتأثر بالأحداث السياسية والاقتصادية. المستثمر الصبور يحصد أفضل النتائج.

4. اقرأ التقارير المالية
الشركات المدرجة ملزمة بنشر تقاريرها المالية. ابحث عن الشركات ذات الأرباح المتنامية.

5. تابع مؤشر RSISX
مؤشر السوق العام يعطيك صورة عن الاتجاه العام · صعود أم هبوط.`,
  },
]

/**
 * Stable anchor ids.
 *
 * Derived from position rather than from the Arabic title, because a
 * percent-encoded Arabic fragment is unreadable in a shared URL and changes
 * the moment a title is edited. The live page's contents list had NO anchors
 * at all — it looked like navigation and navigated nowhere — so these are the
 * first real ones this article has had.
 */
export const sectionId = (i: number): string => `s${i + 1}`

/**
 * The English guide.
 *
 * A faithful translation of the Arabic above, section for section — not a new
 * article and not an expanded one. Where the Arabic names a real constraint
 * (no legal minimum deposit, licensing by the Iraq Securities Commission, the
 * RSISX index) the English says the same thing; nothing is added that the
 * Arabic does not claim, and the same «after each session» correction applies.
 */
export const GUIDE_SECTIONS_EN: GuideSection[] = [
  {
    title: 'What is the Iraq Stock Exchange?',
    body: `The Iraq Stock Exchange (ISX) is the official market for trading shares in listed Iraqi companies. It was established in 2004 and lists more than 100 companies across several sectors: banking, industry, telecoms, investment, insurance and agriculture.

Overall market performance is measured by the Rabee Securities index (RSISX), which tracks the listed shares and reflects the health of the Iraqi economy.`,
  },
  {
    title: 'Trading versus investing',
    body: `Trading: buying and selling shares over short periods — days or weeks — to profit from price movement. It requires daily attention and experience reading charts.

Investing: buying shares and holding them for years to grow capital and earn returns over the long term. It suits beginners better than active trading.

For a beginner, the advice is to start with a long-term investor's mindset before moving to active trading.`,
  },
  {
    title: 'How to start on the Iraq Stock Exchange',
    body: `Step 1 · Choose a licensed broker:
You need an account with a brokerage licensed by the Iraq Securities Commission. Several approved brokers operate in Baghdad and the governorates.

Step 2 · Deposit your capital:
There is no legal minimum, but start with an amount you can afford to lose while you are still learning.

Step 3 · Choose your shares:
Begin by studying companies you already know — the large banks, the telecom operators, the established industrial companies.

Step 4 · Follow the market:
Use IQWealth to follow share prices after each session, read the news and look at the charts.`,
  },
  {
    title: 'How to read a share price',
    body: `Close: the last price at which the share traded during the session.

Daily change: the difference between today's price and yesterday's — green means a rise, red means a fall.

Volume: the number of shares traded in the session — higher volume means more interest in the share.

Market cap: the company's total value = number of shares × share price.

P/E: a measure of how expensive or cheap a share is against the company's earnings. The lower it is, the cheaper the share is relatively.`,
  },
  {
    title: 'Sectors of the Iraq Stock Exchange',
    body: `Listed companies on the Iraq Stock Exchange fall into several main sectors:

• Banking: the largest and most liquid — more than 40 commercial and Islamic banks.
• Telecoms: home to large companies such as Asiacell and Al-Khatem Telecommunications.
• Industry: food, beverage and construction-materials companies.
• Investment: companies managing diversified investment portfolios.
• Hotels and tourism.
• Insurance.`,
  },
  {
    title: 'Advice for a beginner on the Iraq Stock Exchange',
    body: `1. Never invest more than you can afford to lose
Markets move, and losses are a normal part of investing. Invest only what is surplus to your daily needs.

2. Diversify across sectors
Do not put all your money into one sector. Spread it between banking, telecoms and industry.

3. Think long term
Prices on the Iraq Stock Exchange are affected by political and economic events. The patient investor gets the better outcome.

4. Read the financial statements
Listed companies are required to publish their financial reports. Look for companies with growing earnings.

5. Follow the RSISX index
The general market index gives you a picture of the overall direction — rising or falling.`,
  },
]

/** The guide in the reader's language. */
export const guideSections = (locale: 'ar' | 'en') =>
  (locale === 'ar' ? GUIDE_SECTIONS : GUIDE_SECTIONS_EN)
