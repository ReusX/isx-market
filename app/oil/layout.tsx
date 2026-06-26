import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'سعر النفط اليوم في العراق مباشر | سعر برميل برنت وخام البصرة بالدولار والدينار' },
  description: 'سعر النفط اليوم مباشر · سعر برميل النفط برنت وغرب تكساس WTI وخام البصرة الثقيل والمتوسط وسلة أوبك بالدولار والدينار العراقي لحظة بلحظة. Live oil price today: Brent, WTI, Iraq Basrah crude and the OPEC basket in USD and Iraqi Dinar per barrel.',
  alternates: { canonical: 'https://iraqsm.com/oil' },
  keywords: [
    // Arabic — top Iraq oil searches
    'سعر النفط', 'سعر النفط اليوم', 'سعر برميل النفط اليوم', 'سعر النفط العراقي',
    'سعر نفط البصرة', 'خام البصرة الثقيل', 'سعر برميل النفط بالدينار العراقي',
    'سعر برنت اليوم', 'سعر خام برنت', 'سعر النفط برنت', 'سعر غرب تكساس',
    'سلة اوبك', 'سعر النفط مباشر', 'اسعار النفط اليوم', 'سعر البرميل اليوم',
    'كم سعر برميل النفط', 'سعر النفط بالدولار',
    // English
    'oil price today', 'oil price iraq', 'iraq oil price today', 'basrah crude price',
    'basrah heavy oil price', 'brent crude price today', 'wti crude price',
    'opec basket price', 'oil price per barrel', 'crude oil price iraq',
  ],
  openGraph: {
    url: 'https://iraqsm.com/oil',
    title: 'سعر النفط اليوم في العراق · برنت وخام البصرة وسلة أوبك · Iraq Oil Price',
    description: 'سعر برميل النفط اليوم مباشر: برنت، غرب تكساس WTI، خام البصرة، وسلة أوبك بالدولار والدينار العراقي. Live Brent, WTI, Basrah & OPEC basket prices.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://iraqsm.com/oil',
      url: 'https://iraqsm.com/oil',
      name: 'Oil Price Today in Iraq · Brent, WTI, Basrah Crude & OPEC Basket',
      description: 'Live oil price today in USD and Iraqi Dinar per barrel · Brent, WTI, Iraq Basrah Heavy/Medium crude, Dubai and the OPEC basket.',
      inLanguage: ['ar-IQ', 'en'],
      about: { '@type': 'Thing', name: 'Oil Price', sameAs: 'https://en.wikipedia.org/wiki/Price_of_oil' },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Iraq Stock Market', item: 'https://iraqsm.com' },
          { '@type': 'ListItem', position: 2, name: 'Oil Price in Iraq', item: 'https://iraqsm.com/oil' },
        ],
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the oil price today?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The live oil price today is shown per barrel in USD and Iraqi Dinar for the main benchmarks — Brent, WTI (West Texas Intermediate), the OPEC basket — and for Iraq’s own export grades, Basrah Heavy and Basrah Medium. Prices update daily on iraqsm.com/oil.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the price of Iraqi Basrah crude oil?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Basrah Heavy and Basrah Medium are Iraq’s main export crude grades, priced relative to global benchmarks. Their live USD-per-barrel price (and the Iraqi Dinar equivalent at the current exchange rate) is listed at the top of iraqsm.com/oil.',
          },
        },
        {
          '@type': 'Question',
          name: 'كم سعر برميل النفط اليوم؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'يظهر سعر برميل النفط اليوم بالدولار الأمريكي وبالدينار العراقي لأهم الخامات: برنت، غرب تكساس WTI، سلة أوبك، إضافة إلى خام البصرة العراقي الثقيل والمتوسط. تُحدَّث الأسعار يومياً في iraqsm.com/oil.',
          },
        },
        {
          '@type': 'Question',
          name: 'كم سعر نفط البصرة العراقي اليوم؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'خام البصرة الثقيل والبصرة المتوسط هما خاما التصدير الرئيسيان للعراق، ويُسعَّران مقارنة بالمؤشرات العالمية. يمكنك متابعة سعر البرميل بالدولار وما يعادله بالدينار العراقي في أعلى صفحة النفط على iraqsm.com/oil.',
          },
        },
      ],
    },
  ],
}

export default function OilLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Server-rendered SEO H1 · the price widget below is client-rendered */}
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        سعر النفط اليوم في العراق · سعر برميل برنت وخام البصرة وسلة أوبك بالدولار والدينار العراقي
      </h1>

      {children}

      {/* Server-rendered SEO content (Arabic · matches top oil-price queries) */}
      <section
        dir="rtl"
        aria-label="سعر النفط في العراق"
        style={{
          maxWidth: 800, margin: '0 auto', padding: '32px 24px 8px',
          borderTop: '1px solid var(--line, #1f2937)', lineHeight: 1.85,
          fontSize: 15, color: 'var(--ink3, #9ca3af)', textAlign: 'right',
        }}
      >
        <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink, #e5e7eb)', marginBottom: 14 }}>
          سعر النفط اليوم في العراق بالدولار والدينار العراقي
        </h2>
        <p style={{ marginBottom: 16 }}>
          توفّر هذه الصفحة سعر برميل النفط اليوم مباشر لأهم الخامات العالمية والإقليمية: خام برنت، وخام غرب تكساس
          الوسيط (WTI)، وسلة أوبك، وخام دبي، إضافة إلى خامي التصدير العراقيين الرئيسيين البصرة الثقيل والبصرة المتوسط.
          تُعرض الأسعار بالدولار الأمريكي للبرميل مع ما يعادلها بالدينار العراقي حسب سعر الصرف الحالي.
        </p>
        <p style={{ marginBottom: 24 }}>
          يُعدّ النفط العمود الفقري للاقتصاد العراقي ومصدر معظم إيرادات الموازنة، لذا فإن متابعة سعر برميل النفط
          وأسعار خام البصرة وبرنت يومياً تهمّ المستثمر والمواطن على حدّ سواء. تتغيّر الأسعار تبعاً للعرض والطلب
          العالميين وقرارات أوبك+ والأوضاع الجيوسياسية.
        </p>

        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink, #e5e7eb)', marginBottom: 12 }}>
          أسئلة شائعة عن سعر النفط
        </h2>
        {[
          {
            q: 'كم سعر برميل النفط اليوم؟',
            a: 'يظهر سعر برميل النفط اليوم بالدولار وبالدينار العراقي لأهم الخامات في أعلى الصفحة: برنت، غرب تكساس WTI، سلة أوبك، وخام البصرة العراقي. تُحدَّث الأسعار يومياً.',
          },
          {
            q: 'كم سعر نفط البصرة العراقي اليوم؟',
            a: 'خام البصرة الثقيل والبصرة المتوسط هما خاما التصدير الرئيسيان للعراق. يمكنك متابعة سعر البرميل بالدولار وما يعادله بالدينار العراقي في بطاقة العراق أعلى الصفحة.',
          },
          {
            q: 'ما الفرق بين خام برنت وغرب تكساس WTI؟',
            a: 'برنت هو المؤشر العالمي المرجعي لنفط بحر الشمال ويُستخدم لتسعير معظم خامات الشرق الأوسط، بينما غرب تكساس الوسيط (WTI) هو المؤشر الأمريكي. عادةً ما يكون سعر برنت أعلى قليلاً من WTI.',
          },
          {
            q: 'لماذا يهمّ سعر النفط الاقتصاد العراقي؟',
            a: 'يشكّل النفط الجزء الأكبر من إيرادات الموازنة العراقية والصادرات، لذا يؤثّر سعر برميل النفط مباشرة على الإنفاق الحكومي وسعر صرف الدينار والوضع الاقتصادي العام.',
          },
        ].map(item => (
          <div key={item.q} style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink, #e5e7eb)', margin: '0 0 4px' }}>{item.q}</h3>
            <p style={{ margin: 0 }}>{item.a}</p>
          </div>
        ))}
      </section>
    </>
  )
}
