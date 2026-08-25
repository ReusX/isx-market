/**
 * The Privacy Policy and the Terms of Use — PUBLISHED COPY.
 *
 * ═══ HOW THIS WAS WRITTEN ══════════════════════════════════════════════════
 * Not from a template. Every factual sentence below was checked against the
 * real product at isx-market@d2f60cc, read-only, and anything that could not
 * be verified was left open for the operator rather than guessed — see the
 * STATUS block further down for how those seven fields were finally answered.
 * The verified inventory:
 *
 * ── Authentication ────────────────────────────────────────────────────────
 * `components/auth/AuthModal.tsx` calls exactly four Supabase methods:
 * `signInWithPassword`, `signUp`, `resetPasswordForEmail`, `signOut`. Email
 * and password only — no OAuth, no OTP, no magic link, no phone, no MFA.
 * Sign-up sends a confirmation link («أرسلنا لك رابط التأكيد»), so email
 * verification is ON. Passwords never reach the application: they are handed
 * to Supabase Auth, and the app stores no password field of its own.
 *
 * ── What the app writes to `profiles` ─────────────────────────────────────
 * `id`, `email`, `username`, `referral_code`, `referred_by`, `streak`
 * (AuthModal), `username` again (profile page), `watchlist` (AppContext),
 * `portfolio` and `price_alerts` (lib/portfolio.ts). Nothing else.
 *
 * ── Personal financial data · what it actually is ─────────────────────────
 * `lib/portfolio.ts` · a lot is `{ sym, qty, price, date?, note? }` and an
 * alert is `{ sym, dir, target, basePrice, … }`. All of it is TYPED BY THE
 * USER. There is no broker link, no account number, no order, no settlement,
 * no custody, and nothing is ever sent to a broker or an exchange.
 *
 * ── Local storage · six keys, all of them ─────────────────────────────────
 * `lang`, `theme`, `isx_watchlist`, `isx_portfolio`, `isx_alerts`,
 * `kf-sidebar`. Portfolio, alerts and watchlist work fully offline and
 * anonymously in localStorage; the Supabase copy is a SYNC, not the store.
 *
 * ── Cookies ───────────────────────────────────────────────────────────────
 * `lib/supabase/server.ts` reads `cookies()`; `@supabase/ssr` keeps the
 * session there. That is the only cookie the product sets. There is no
 * advertising cookie, no marketing pixel and no consent banner.
 *
 * ── Analytics · THE FINDING THAT CHANGES THE POLICY ───────────────────────
 * ⚠ `app/layout.tsx:170–171` renders `<Analytics />` from `@vercel/analytics`
 *   and `<SpeedInsights />` from `@vercel/speed-insights`. The old policy said
 *   «قد نستخدم خدمات تحليل مجهولة الهوية» — hedged, and understated. Two
 *   named measurement services are live on every page, and they are disclosed
 *   here by name. Searched and NOT found: Google Analytics, GA4, Plausible,
 *   PostHog, Meta Pixel, Hotjar, Mixpanel, Segment.
 *
 * ── Processors, and what each one is ──────────────────────────────────────
 *   Supabase   auth + database. Receives account data and the synced lists.
 *   Vercel     hosting + the two measurement products above.
 *   WordPress  `cms.iraqsm.com` — SOURCE of articles. Receives no user data.
 * The market-data origins (`api.isc.gov.iq`, `isx-iq.net`, Rabee, Mubasher,
 * `iraqgoldprice.com`, `oilprice.com`, Alsumaria) are PUBLIC SOURCES the
 * pipeline reads. They receive nothing about any user, and the policy says so
 * rather than lumping them in with the processors.
 *
 * ── Not present, therefore not written about ──────────────────────────────
 * No payments, no card data, no advertising system, no contact form (so no
 * stored messages), no file upload, no user-generated public content, no
 * newsletter, no push notifications.
 *
 * ═══ LEGAL RESEARCH · what is actually in force in Iraq ════════════════════
 * Checked August 2026:
 *
 *   · Iraq has NO comprehensive personal-data-protection statute in force. A
 *     draft Personal Data Protection Law has existed since 2021 and is
 *     expected to be finalised around the end of 2026. It is NOT cited here
 *     as if it were law, and no GDPR-style compliance is claimed.
 *   · The 2005 Constitution, art. 17(1), protects personal privacy.
 *   · Electronic Signature and Electronic Transactions Law No. 78 of 2012 is
 *     in force; implementation instructions were issued in May 2025.
 *   · Copyright Law No. 3 of 1971, as amended by CPA Order 83 of 2004.
 *   · ⚠ CMC Framework Regulations for Digital Platforms and Services, issued
 *     17 February 2025, cover platforms serving Iraqi users and set out
 *     licensing / registration / notification tiers, with a conditional
 *     exemption reported for platforms under ~5,000 users. WHETHER IQWEALTH
 *     MUST REGISTER IS AN OPEN QUESTION and is on the review checklist. It is
 *     not asserted either way in the published text.
 *
 * Where the legal position is unsettled the drafting is conservative and the
 * question is flagged, never resolved by invention.
 *
 * ── STATUS · the seven counsel markers are RESOLVED ──────────────────────
 * Final copy was supplied by the operator on 2026-08-25 and replaces every
 * `[مراجعة قانونية: …]` marker this file used to carry. The wording is
 * deliberately conservative and it is what the operator chose to publish:
 *
 *   operator     identified as the platform IQWealth on iraqsm.com, with no
 *                legal-entity name or registered address invented for it
 *   hosting      «inside Iraq or outside, depending on the provider» — no
 *                country is named, because none was verified
 *   retention    criteria, not fixed periods: the product enforces no timer,
 *                so none is promised
 *   age          18+, stated and enforceable by account restriction
 *   liability    limited to what Iraqi law permits, with the carve-out for
 *                what may not be excluded left intact
 *   indemnity    deliberately ABSENT. The section is now «الاستخدام المسؤول»
 *                and says in as many words that no clause obliges the user to
 *                indemnify us for third-party claims
 *   law          Iraqi law and the competent Iraqi courts, with no specific
 *                court or venue named
 *
 * Standing claims, unchanged and still true: no GDPR compliance is asserted;
 * no comprehensive Iraqi data-protection statute is claimed to govern the
 * platform; no regulatory status, licence or brokerage capacity is claimed
 * anywhere; account deletion is still the manual email process the product
 * actually performs, with no promised turnaround.
 *
 * `REVIEW()` below is intentionally kept. Nothing calls it today, and that is
 * the point — it is the machinery for marking the next open field visibly if
 * one ever appears, rather than letting it hide inside smooth prose.
 */

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  /** A sentence that carries more weight than the paragraph around it. */
  | { kind: "note"; text: string };

export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };

/**
 * The marker for a field only the owner or a lawyer can fill.
 *
 * §10 of the brief: do not invent an operator name, an address, a
 * jurisdiction or a court. Every one of those appears below as this marker,
 * visibly, because a draft that hides its own gaps is worse than one that
 * shows them — a reader can see it is unfinished, and nobody can publish it
 * by accident.
 */
export const REVIEW = (what: string) => `[مراجعة قانونية: ${what}]`;

/* ═══ سياسة الخصوصية ═══════════════════════════════════════════════════════ */

export const PRIVACY_DOC: LegalSection[] = [
  {
    id: "intro",
    title: "مقدّمة",
    blocks: [
      { kind: "p", text: "توضّح هذه السياسة ما الذي تجمعه منصّة IQWealth عنك، ولماذا تجمعه، وأين يُخزَّن، وما الذي يمكنك طلبه بشأنه. وهي تغطّي الموقع وجميع صفحاته وخدماته." },
      { kind: "p", text: "المنصّة مجانية ولا تتقاضى أي مبالغ، ولا تطلب بيانات بطاقات أو حسابات مصرفية، ولا تنفّذ أي عملية شراء أو بيع. يمكنك تصفّح معظم الصفحات دون إنشاء حساب أصلاً؛ ولا يُجمع عنك سوى بيانات تقنية محدودة موضّحة أدناه." },
      { kind: "note", text: "لا توجد في العراق حتى تاريخ هذه النسخة قوانين شاملة لحماية البيانات الشخصية نافذة، وثمّة مشروع قانون قيد الإعداد. نلتزم بما هو نافذ، ونصوغ هذه السياسة على نحو متحفّظ لا يَعِد بما لا نستطيع تنفيذه." },
    ],
  },
  {
    id: "operator",
    title: "من يدير المنصة",
    blocks: [
      { kind: "p", text: "تُدار منصة IQWealth عبر النطاق iraqsm.com، ويُشار إليها في هذه السياسة بعبارات «المنصة» أو «نحن». IQWealth منصة معلومات وبيانات مالية وليست وسيطاً مالياً أو بورصةً أو مستشاراً استثمارياً." },
      { kind: "p", text: "لأي استفسار يتعلق بالخصوصية أو البيانات الشخصية، استخدم وسيلة التواصل المنشورة في صفحة «اتصل بنا». ويُعد البريد الإلكتروني المنشور هناك قناة الاتصال الرسمية للطلبات المتعلقة بالوصول إلى البيانات أو تصحيحها أو حذف الحساب." },
    ],
  },
  {
    id: "collect",
    title: "المعلومات التي نجمعها",
    blocks: [
      { kind: "p", text: "نجمع أربع فئات فقط، ولا نجمع غيرها:" },
      {
        kind: "ul",
        items: [
          "بيانات الحساب: بريدك الإلكتروني واسم المستخدم الذي تختاره. تُدار كلمة المرور بالكامل لدى مزوّد المصادقة (Supabase Auth) ولا تصل إلينا ولا نخزّنها بأي صورة.",
          "بياناتك داخل المنصّة: قوائم المتابعة، ومحتويات المحفظة التي تُدخلها بنفسك (الرمز، الكمية، سعر الشراء، وتاريخ أو ملاحظة اختيارية)، وتنبيهات الأسعار التي تنشئها.",
          "تفضيلاتك: اللغة، والمظهر الفاتح أو الداكن، وحالة القائمة الجانبية.",
          "بيانات تقنية: تعالج بنيتنا التحتية عنوان IP وبيانات المتصفّح والجهاز وسجلّات الطلبات وقياسات الأداء، على النحو الموضّح في بند مزوّدي الخدمة.",
        ],
      },
      { kind: "p", text: "وإذا راسلتنا عبر البريد الإلكتروني، فإن رسالتك وعنوان مُرسِلها يبقيان في صندوق بريدنا. لا توجد في الموقع استمارة تواصل، ولا نخزّن الرسائل في قاعدة بياناتنا." },
      { kind: "note", text: "لا نطلب رقم الهوية، ولا العنوان، ولا بيانات مصرفية، ولا أي مستند مالي، ولا نتيح رفع الملفات." },
    ],
  },
  {
    id: "use",
    title: "كيف نستخدم المعلومات",
    blocks: [
      {
        kind: "ul",
        items: [
          "تشغيل حسابك: تسجيل الدخول، وتأكيد البريد الإلكتروني، وإعادة تعيين كلمة المرور.",
          "حفظ ما تُنشئه ومزامنته بين أجهزتك: قوائم المتابعة، والمحفظة، والتنبيهات، والتفضيلات.",
          "تشغيل الميزات التي تطلبها، وعرض الأسعار والمؤشرات المرتبطة بما تتابعه.",
          "أمن الخدمة ومعالجة الأعطال وإساءة الاستخدام.",
          "الردّ عليك إذا راسلتنا.",
          "قياس الأداء والاستخدام العام لتحسين المنصّة، عبر الخدمتين المذكورتين في بند مزوّدي الخدمة.",
        ],
      },
      { kind: "p", text: "لا نستخدم بياناتك في الإعلان، ولا نبيعها، ولا نؤجّرها، ولا نتاجر بها، ولا نبني منها ملفّات إعلانية، ولا نشاركها مع وسطاء بيانات." },
    ],
  },
  {
    id: "basis",
    title: "أساس المعالجة واختيارك",
    blocks: [
      { kind: "p", text: "نعالج بيانات الحساب وما تُنشئه داخل المنصّة لأنك طلبت الخدمة: من دونها لا يمكن تشغيل حساب ولا حفظ محفظة. ونعالج البيانات التقنية للقدر اللازم لتشغيل الموقع وحمايته." },
      { kind: "p", text: "اختيارك عملي ومباشر: يمكنك استخدام المنصّة دون حساب، ويمكنك عدم إدخال أي بيانات في المحفظة، ويمكنك حذف أي عنصر أضفته في أي وقت، ويمكنك تسجيل الخروج ومسح تخزين المتصفّح لإزالة النسخة المحفوظة محلياً." },
    ],
  },
  {
    id: "cookies",
    title: "ملفات الارتباط والتخزين المحلي",
    blocks: [
      { kind: "p", text: "نستخدم ملف ارتباط واحد فقط، وهو ملف الجلسة الذي يُبقيك مسجّل الدخول ويديره مزوّد المصادقة. لا نستخدم ملفات ارتباط إعلانية، ولا بكسل تتبّع، ولا أدوات تتبّع عبر المواقع." },
      { kind: "p", text: "ونستخدم التخزين المحلي في متصفّحك — لا على خوادمنا — للاحتفاظ بستة مفاتيح: اللغة، والمظهر، وقائمة المتابعة، والمحفظة، والتنبيهات، وحالة القائمة الجانبية. هذا ما يجعل المحفظة وقوائم المتابعة تعمل دون حساب. ومسح بيانات الموقع من متصفّحك يمحو هذه النسخة." },
    ],
  },
  {
    id: "processors",
    title: "مزوّدو الخدمة",
    blocks: [
      { kind: "p", text: "نعتمد على مزوّدين خارجيين لتشغيل المنصّة، ولكلٍّ منهم دور محدّد:" },
      {
        kind: "ul",
        items: [
          "Supabase — المصادقة وقاعدة البيانات. تُخزَّن لديه بيانات الحساب وقوائم المتابعة والمحفظة والتنبيهات، وتُدار لديه كلمات المرور ورسائل التأكيد وإعادة التعيين.",
          "Vercel — الاستضافة وتشغيل الموقع. تمرّ عبره طلبات التصفّح وما يرافقها من بيانات تقنية.",
          "Vercel Analytics وVercel Speed Insights — قياس الاستخدام العام وأداء الصفحات. يعملان على جميع الصفحات.",
        ],
      },
      { kind: "p", text: "وننشر مواداً تحريرية من نظام إدارة محتوى خاص بنا. هذا النظام مصدرٌ للمحتوى ولا يستقبل أي بيانات عنك." },
      { kind: "note", text: "مصادر بيانات السوق — هيئة الأوراق المالية العراقية وسوق العراق للأوراق المالية وشركات الوساطة والمصادر الإعلامية ومواقع أسعار الذهب والنفط — نقرأ منها معلومات منشورة للعموم. لا نرسل إليها شيئاً عنك، ولا علاقة لها ببياناتك الشخصية." },
      { kind: "p", text: "تعتمد المنصة على مزوّدي خدمات تقنيين من أطراف ثالثة لتشغيل الاستضافة وقواعد البيانات والمصادقة والتحليلات والخدمات المساندة. وقد تُعالج البيانات أو تُخزّن على بنية تحتية تقع داخل العراق أو خارجه بحسب مزوّد الخدمة وموقع أنظمته في وقت المعالجة." },
      { kind: "p", text: "لا نَعِد بأن جميع البيانات تبقى داخل دولة أو مركز بيانات محدد. وعند استخدام مزوّد خارجي، نقتصر قدر الإمكان على البيانات اللازمة لتشغيل الخدمة ونطبق وسائل الحماية المتاحة في المنتج وإعدادات المزوّد." },
    ],
  },
  {
    id: "financial",
    title: "بيانات المحفظة وقوائم المتابعة",
    blocks: [
      { kind: "p", text: "المحفظة وقوائم المتابعة والتنبيهات أدوات تتبّع شخصية: أنت من يُدخل الأرقام، ونحن نحفظها ونعرضها ونحسب منها القيمة والربح والخسارة." },
      { kind: "note", text: "IQWealth ليست وسيطاً مالياً ولا جهة حفظ. لا نحتفظ بأوراق مالية ولا بأموال، ولا ننفّذ أوامر بيع أو شراء، ولا نتّصل بحسابك لدى أي وسيط، ولا نتحقّق من أرصدتك الفعلية. ما تُدخله هنا تسجيلٌ لديك، لا حساب استثماري." },
    ],
  },
  {
    id: "retention",
    title: "مدة الاحتفاظ بالبيانات",
    blocks: [
      { kind: "p", text: "نحتفظ بالبيانات الشخصية فقط للمدة اللازمة للغرض الذي جُمعت من أجله، أو لتشغيل الحساب والخدمة، أو لحماية المنصة من إساءة الاستخدام، أو للوفاء بالتزامات قانونية واجبة التطبيق." },
      { kind: "p", text: "عند إغلاق الحساب أو قبول طلب حذفه، نحذف أو نُخفي هوية البيانات المرتبطة بالحساب عندما لا تعود هناك حاجة مشروعة للاحتفاظ بها. وقد تبقى نسخ محدودة لمدة إضافية داخل النسخ الاحتياطية أو سجلات الأمان إلى أن تنتهي دورة الاحتفاظ الخاصة بتلك الأنظمة أو عندما يكون الاحتفاظ مطلوباً لإثبات معاملة أو التعامل مع نزاع أو متطلب قانوني." },
      { kind: "p", text: "لا نستخدم مدة احتفاظ واحدة لجميع أنواع البيانات؛ وتختلف المدة بحسب نوع السجل والغرض منه. ويمكن طلب معلومات عن فئة محددة من البيانات عبر قناة الخصوصية المنشورة في صفحة «اتصل بنا»." },
      { kind: "note", text: "عملياً: بيانات حسابك وما أنشأته داخل المنصّة تبقى ما دام الحساب قائماً، لأن هذه البيانات هي الخدمة نفسها. والبيانات التقنية والسجلّات تُحفظ لدى مزوّدي الخدمة وفق دورات الاحتفاظ الخاصة بهم." },
    ],
  },
  {
    id: "deletion",
    title: "حذف الحساب والبيانات",
    blocks: [
      { kind: "p", text: "يمكنك في أي وقت حذف أي عنصر أضفته: صفٌّ من المحفظة، أو رمزٌ من قائمة المتابعة، أو تنبيه. ويُحذف فوراً من المتصفّح ومن حسابك." },
      { kind: "p", text: "ولحذف الحساب بالكامل مع ما يتّصل به من بيانات، راسلنا من العنوان البريدي المسجّل في الحساب. نعالج الطلب يدوياً ونؤكّد لك إتمامه." },
      { kind: "note", text: "لا يوجد حالياً زرّ لحذف الحساب داخل المنصّة، ولذلك لا نَعِد بمدّة زمنية محدّدة للتنفيذ. سيُذكر ذلك هنا صراحةً حين تتوفّر الميزة." },
    ],
  },
  {
    id: "security",
    title: "أمن المعلومات",
    blocks: [
      { kind: "p", text: "يجري الاتصال بالموقع عبر HTTPS، وتُدار المصادقة وكلمات المرور لدى مزوّد متخصّص لا يمنحنا اطّلاعاً على كلمة مرورك، وتُقيَّد صلاحيات الوصول إلى بيانات الحسابات على مستوى قاعدة البيانات بحيث لا يصل المستخدم إلا إلى صفوفه." },
      { kind: "note", text: "لا توجد خدمة على الإنترنت آمنة بصورة مطلقة، ولا نزعم ذلك. ولا نحمل أي شهادة امتثال أو اعتماد أمني، ولا ندّعي أي منها. أنت مسؤول عن سرّية كلمة مرورك." },
    ],
  },
  {
    id: "external",
    title: "الروابط والمصادر الخارجية",
    blocks: [
      { kind: "p", text: "تحتوي المنصّة على روابط لمواقع لا نديرها: جهات رسمية، ومصادر بيانات، ووسائل إعلام، وحسابات التواصل الاجتماعي الخاصة بنا. لكلٍّ منها سياساته الخاصة، ولا تسري هذه السياسة عليها. ووجود رابط لا يعني أننا نشارك ذلك الموقع أي بيانات عنك." },
    ],
  },
  {
    id: "children",
    title: "العمر المسموح",
    blocks: [
      { kind: "p", text: "الخدمة مخصّصة للأشخاص الذين تبلغ أعمارهم 18 عاماً أو أكثر. لا تستهدف المنصة الأطفال ولا تطلب عن علم إنشاء حسابات لأشخاص دون هذا العمر." },
      { kind: "p", text: "إذا تبيّن لنا أن حساباً أُنشئ لشخص دون السن المسموح، يجوز لنا تقييد الحساب أو حذفه واتخاذ الخطوات المعقولة لإزالة البيانات المرتبطة به، مع مراعاة أي التزام قانوني يوجب الاحتفاظ بسجل محدد." },
      { kind: "p", text: "إذا كنت وليّ أمر وتعتقد أن طفلاً أنشأ حساباً، راسلنا وسنعالج الأمر." },
    ],
  },
  {
    id: "rights",
    title: "حقوقك وطلباتك",
    blocks: [
      { kind: "p", text: "يمكنك مراسلتنا من بريدك المسجّل لطلب:" },
      {
        kind: "ul",
        items: [
          "نسخة من بيانات حسابك المخزّنة لدينا.",
          "تصحيح بيانات غير دقيقة، مثل اسم المستخدم.",
          "حذف الحساب وما يتّصل به.",
          "أي استفسار يتعلّق بهذه السياسة.",
        ],
      },
      { kind: "p", text: "نلتزم بما نستطيع تنفيذه فعلاً، ونردّ عادةً خلال يوم إلى يومَي عمل. ولا نَعِد بإجراءات لا تملك المنصّة القدرة على تنفيذها." },
    ],
  },
  {
    id: "changes",
    title: "التغييرات على هذه السياسة",
    blocks: [
      { kind: "p", text: "قد نُحدّث هذه السياسة كلّما تغيّرت المنصّة أو مزوّدو خدماتها. ننشر النسخة المحدّثة على هذه الصفحة ونغيّر تاريخ آخر تحديث أعلاها. ويُنصح بمراجعتها من حين إلى آخر." },
    ],
  },
  {
    id: "contact",
    title: "التواصل",
    blocks: [
      { kind: "p", text: "لأي سؤال أو طلب يتعلّق بالخصوصية، راسلنا على boatlef@gmail.com — وهو البريد نفسه المنشور في صفحة «اتصل بنا». هذه هي القناة المعتمدة لطلبات الخصوصية؛ ولا تُعدّ حسابات التواصل الاجتماعي قناةً رسمية لها." },
      { kind: "p", text: "ومن يدير المنصة موضّح في قسم «من يدير المنصة» أعلاه." },
    ],
  },
];

/* ═══ شروط الاستخدام وإخلاء المسؤولية ══════════════════════════════════════ */

export const TERMS_DOC: LegalSection[] = [
  {
    id: "accept",
    title: "قبول الشروط",
    blocks: [
      { kind: "p", text: "باستخدامك منصّة IQWealth تكون قد اطّلعت على هذه الشروط ووافقت عليها. وإذا لم توافق على أيٍّ منها، فالرجاء عدم استخدام المنصّة." },
      { kind: "p", text: "تنطبق هذه الشروط على جميع الزوّار، سواء أنشأوا حساباً أم لا." },
    ],
  },
  {
    id: "what",
    title: "ما هي IQWealth",
    blocks: [
      { kind: "p", text: "IQWealth منصّة معلومات وأدوات تختصّ بسوق العراق للأوراق المالية. تقدّم أسعاراً ومؤشّرات وبيانات عن الشركات المدرجة، وإحصاءات السوق والتدفّق الأجنبي، ومحتوى تعليمياً وإخبارياً، وأدوات شخصية لتتبّع المحفظة وقوائم المتابعة، إضافةً إلى صفحات لأسعار الصرف والذهب والنفط." },
      { kind: "note", text: "IQWealth ليست شركة وساطة، ولا سوقاً مالياً، ولا مستشاراً استثمارياً، ولا جهة حفظ، ولا مصرفاً، ولا وسيطاً مالياً خاضعاً للترخيص. لا تنفّذ صفقات ولا تتلقّى أموالاً ولا تحتفظ بأوراق مالية." },
    ],
  },
  {
    id: "noadvice",
    title: "لا توجد نصيحة استثمارية",
    blocks: [
      { kind: "p", text: "كل ما يُعرض على المنصّة — من أسعار وتحليلات وإحصاءات ومقالات وأدوات — هو لغرض الاطّلاع والتعليم فقط، ولا يُشكّل توصيةً بشراء أو بيع أي ورقة مالية، ولا نصيحةً مالية أو قانونية أو ضريبية، ولا عرضاً أو دعوةً للاستثمار." },
      { kind: "p", text: "لا نعرف ظروفك المالية ولا أهدافك ولا قدرتك على تحمّل المخاطر، ولا تُبنى أي مادة على المنصّة على وضعك الشخصي. قرارك الاستثماري قرارك وحدك ومسؤوليتك وحدك، ويُستحسن أن يسبقه استشارة مختصّ مؤهّل." },
    ],
  },
  {
    id: "risk",
    title: "مخاطر الاستثمار",
    blocks: [
      { kind: "p", text: "أسعار الأوراق المالية ترتفع وتنخفض، وقد تفقد جزءاً من رأس مالك أو كلّه. والأداء السابق، مهما بدا متماسكاً، لا يضمن أداءً مستقبلياً. وقد يتعذّر بيع بعض الأسهم قليلة السيولة بالسعر المعروض أو في الوقت المطلوب." },
    ],
  },
  {
    id: "data",
    title: "بيانات السوق ودقّتها",
    blocks: [
      { kind: "p", text: "نستقي البيانات من مصادر منشورة: هيئة الأوراق المالية العراقية وسوق العراق للأوراق المالية، والإفصاحات والنشرات الرسمية للشركات المدرجة، وشركات وساطة ومصادر إعلامية ومواقع متخصّصة بأسعار الصرف والذهب والنفط. ونجتهد في نقلها ومعالجتها بدقّة." },
      {
        kind: "p",
        text: "ومع ذلك، لا نضمن دقّة البيانات ولا اكتمالها ولا توقيتها. وقد تكون:",
      },
      {
        kind: "ul",
        items: [
          "متأخّرة عن السوق، فما يُعرض ليس بالضرورة سعراً لحظياً.",
          "ناقصة أو غير متاحة إذا تعذّر الوصول إلى المصدر.",
          "مُعدَّلة لاحقاً من المصدر نفسه، كما يحدث في البيانات المالية والإحصاءات الشهرية.",
          "متأثّرة بخطأ في المصدر أو في المعالجة لدينا.",
        ],
      },
      { kind: "note", text: "قبل اتّخاذ أي قرار يعتمد على رقم بعينه، راجع تاريخ التحديث والمصدر المذكورَين إلى جانبه، وتحقّق منه لدى المصدر الرسمي. المصدر الرسمي هو المرجع عند الاختلاف، لا المنصّة." },
    ],
  },
  {
    id: "derived",
    title: "البيانات المشتقّة والحسابات",
    blocks: [
      { kind: "p", text: "تُحتسب على المنصّة قيمٌ مشتقّة من البيانات الأساسية، منها القيمة السوقية والمكرّرات والنِّسب المالية والمجاميع القطاعية وملخّصات التدفّق الأجنبي والترتيبات والمقاييس الإحصائية." },
      { kind: "p", text: "هذه القيم نتاج منهجية نتّبعها نحن، وتتغيّر بتغيّر البيانات الأساسية أو المنهجية، وقد تختلف عن أرقام تنشرها جهات أخرى تستخدم تعريفاً مختلفاً. وهي معروضة للاطّلاع، لا بوصفها رقماً رسمياً." },
    ],
  },
  {
    id: "accounts",
    title: "الحسابات",
    blocks: [
      { kind: "p", text: "إنشاء الحساب اختياري، ويتطلّب بريداً إلكترونياً صالحاً وكلمة مرور. أنت مسؤول عن صحّة البيانات التي تُدخلها، وعن سرّية كلمة مرورك، وعن كل نشاط يجري عبر حسابك." },
      { kind: "p", text: "أبلغنا فوراً إذا اشتبهت في وصول غير مصرّح به إلى حسابك. ولا يجوز مشاركة الحساب أو استخدام حساب شخص آخر." },
    ],
  },
  {
    id: "portfolio",
    title: "المحفظة وقوائم المتابعة",
    blocks: [
      { kind: "p", text: "المحفظة وقوائم المتابعة والتنبيهات أدوات تنظيم وتتبّع تُدخل بياناتها بنفسك. وما تعرضه من قيمة وربح وخسارة يُحتسب من أرقامك أنت ومن آخر سعر متاح لدينا." },
      { kind: "note", text: "هذه الأدوات لا تحتفظ بأوراق مالية، ولا تنفّذ أوامر، ولا تحوّل أموالاً، ولا تتحقّق من أرصدتك لدى وسيطك. وأي فرق بين ما تعرضه المنصّة وكشف حسابك لدى الوسيط، فالكشف هو المرجع." },
    ],
  },
  {
    id: "use",
    title: "الاستخدام المقبول",
    blocks: [
      { kind: "p", text: "استخدم المنصّة استخداماً معقولاً ومشروعاً. وتحديداً، لا يجوز:" },
      {
        kind: "ul",
        items: [
          "محاولة الوصول غير المصرّح به إلى الأنظمة أو الحسابات أو البيانات.",
          "تعطيل الخدمة أو إثقالها أو التدخّل في عملها.",
          "السحب الآلي المكثّف للمحتوى على نحو يضرّ بالخدمة أو يخالف القواعد المنشورة.",
          "إعادة نشر محتوى المنصّة أو بيعه بما يخالف بند الملكية الفكرية.",
          "استخدام المنصّة في أي غرض مخالف للقانون.",
        ],
      },
    ],
  },
  {
    id: "ip",
    title: "الملكية الفكرية",
    blocks: [
      { kind: "p", text: "تصميم المنصّة وواجهتها وشعارها وعلامتها، والمواد التحريرية والتعليمية التي نكتبها، وتنظيم قواعد بياناتنا وتجميعها بالقدر الذي يشمله القانون — كلّها مملوكة لنا، ولا يجوز نسخها أو إعادة نشرها تجارياً دون إذن مسبق." },
      { kind: "p", text: "وفي المقابل، لا ندّعي ملكية ما ليس لنا: البيانات المنشورة من الجهات الرسمية والشركات المدرجة، وأسماء الشركات وشعاراتها، والوثائق والإفصاحات الأصلية، والمحتوى العائد لمصادر خارجية — كلٌّ منها لأصحابه. والوقائع السوقية بذاتها ليست ملكاً لأحد." },
      { kind: "p", text: "ويجوز الاقتباس المحدود مع الإشارة إلى المصدر ورابط الصفحة." },
    ],
  },
  {
    id: "links",
    title: "الروابط والمصادر الخارجية",
    blocks: [
      { kind: "p", text: "تُحيل المنصّة إلى مواقع ووثائق لا نديرها. لا نتحمّل مسؤولية محتواها ولا دقّتها ولا سياساتها ولا استمرار توفّرها، ووجود الرابط لا يعني إقراراً بما فيه." },
    ],
  },
  {
    id: "availability",
    title: "توافر الخدمة",
    blocks: [
      { kind: "p", text: "المنصّة قيد التطوير المستمر. قد نُجري صيانة، أو نضيف ميزات أو نعدّلها أو نوقفها، أو نغيّر مصادر البيانات، أو تنقطع الخدمة كلياً أو جزئياً لأسباب تقنية أو لأسباب تخصّ مصادرنا." },
      { kind: "p", text: "لا نَعِد باستمرارية الخدمة دون انقطاع، ولا بإتاحة ميزة بعينها إلى الأبد. ونسعى إلى تقليل الانقطاع قدر المستطاع." },
    ],
  },
  {
    id: "liability",
    title: "حدود المسؤولية",
    blocks: [
      { kind: "p", text: "تُقدَّم المنصة ومحتواها وبياناتها وأدواتها على أساس معلوماتي. نبذل جهداً معقولاً لعرض البيانات بصورة دقيقة ومحدثة، لكننا لا نضمن أن تكون كل البيانات كاملة أو خالية من التأخير أو الأخطاء أو الانقطاعات، ولا نضمن استمرار توفر أي مصدر خارجي." },
      { kind: "p", text: "أنت مسؤول عن التحقق من المعلومات قبل اتخاذ أي قرار مالي أو استثماري. ولا تُعد الأسعار أو المؤشرات أو الإحصاءات أو الأخبار أو الأدوات المعروضة توصيةً بشراء أو بيع أي ورقة مالية، ولا تشكّل استشارة استثمارية أو قانونية أو ضريبية." },
      { kind: "p", text: "إلى أقصى حد يسمح به القانون العراقي الواجب التطبيق، لا نتحمل المسؤولية عن الخسائر غير المباشرة أو التبعية أو خسارة الفرص أو الأرباح الناتجة عن الاعتماد على معلومات المنصة أو تعذر الوصول إليها. ولا يحد هذا النص من أي مسؤولية لا يجوز قانوناً استبعادها أو تقييدها." },
      { kind: "note", text: "المنصّة مجانية وتُقدَّم بحالتها الراهنة، ويشمل ما سبق انقطاع الخدمة، وخطأ أو تأخّر أو نقص في بيانات مصدر خارجي، وفقدان بيانات محفوظة في متصفّحك." },
    ],
  },
  {
    id: "indemnity",
    title: "الاستخدام المسؤول",
    blocks: [
      { kind: "p", text: "تتعهد بعدم استخدام المنصة بطريقة غير مشروعة، أو لمحاولة الوصول غير المصرح به إلى الحسابات أو الأنظمة، أو لتعطيل الخدمة، أو لاستخراج البيانات آلياً على نحو يضر بالبنية التحتية أو يتجاوز وسائل الوصول التي نتيحها صراحةً." },
      { kind: "p", text: "يجوز لنا تقييد أو إيقاف الوصول عند وجود سبب معقول للاعتقاد بوجود إساءة استخدام أو خطر أمني أو مخالفة جوهرية لهذه الشروط، مع مراعاة القانون الواجب التطبيق." },
      { kind: "note", text: "لا تتضمّن هذه الشروط بنداً يُلزمك بتعويضنا عن مطالبات الغير." },
    ],
  },
  {
    id: "changes",
    title: "التعديلات على الشروط",
    blocks: [
      { kind: "p", text: "قد نعدّل هذه الشروط كلّما تطوّرت المنصّة. تُنشر النسخة المعدّلة على هذه الصفحة مع تحديث تاريخها، ويُعدّ استمرارك في الاستخدام بعد النشر قبولاً بها. وإذا كان التعديل جوهرياً، نسعى إلى التنويه به داخل المنصّة." },
    ],
  },
  {
    id: "termination",
    title: "إنهاء الحساب أو تقييده",
    blocks: [
      { kind: "p", text: "يمكنك التوقّف عن استخدام المنصّة في أي وقت، وطلب حذف حسابك على النحو الموضّح في سياسة الخصوصية." },
      { kind: "p", text: "ويجوز لنا تقييد حساب أو إيقافه إذا استُخدم على نحو يضرّ بالخدمة أو بمستخدميها أو يخالف بند الاستخدام المقبول. ونسعى إلى إشعارك عبر بريدك المسجّل ما لم يمنع ذلك سببٌ أمني." },
    ],
  },
  {
    id: "law",
    title: "القانون الواجب التطبيق وتسوية النزاعات",
    blocks: [
      { kind: "p", text: "تخضع هذه الشروط وتُفسَّر وفق القوانين النافذة في جمهورية العراق." },
      { kind: "p", text: "إذا نشأ نزاع يتعلق بالمنصة أو بهذه الشروط، نسعى أولاً إلى حله بصورة مباشرة ومعقولة عبر قنوات التواصل المنشورة في المنصة. وإذا تعذر الحل الودي، يكون الاختصاص للجهات القضائية العراقية المختصة وفق قواعد الاختصاص النوعي والمكاني المقررة في القانون النافذ." },
      { kind: "p", text: "تُبرم هذه الشروط بين المستخدم ومشغّل منصة IQWealth على النطاق iraqsm.com. استخدام اسم IQWealth في هذه الشروط هو تعريف بالمنصة والخدمة، ولا يُقصد به الادعاء بصفة تنظيمية أو ترخيص مالي غير موجود." },
    ],
  },
  {
    id: "contact",
    title: "التواصل",
    blocks: [
      { kind: "p", text: "لأي استفسار قانوني يتعلّق بهذه الشروط، راسلنا على boatlef@gmail.com." },
    ],
  },
];

/**
 * The date of THIS draft, per §16 — not backdated, and not the June 2026
 * string the real pages hard-code. It is the day the text below was written.
 */
export const DOC_UPDATED = "25 أغسطس 2026";
