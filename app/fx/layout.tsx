import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'سعر الدولار اليوم في العراق | الدولار مقابل الدينار العراقي USD/IQD' },
  description: 'كم سعر الدولار اليوم في العراق؟ سعر صرف الدولار الأمريكي مقابل الدينار العراقي اليوم ٢٠٢٦ — السعر الرسمي للبنك المركزي والسوق الموازية، سعر 100 دولار بالدينار، ومحول العملات IQD/USD المباشر. Live USD to Iraqi Dinar (IQD) exchange rate and currency converter.',
  alternates: { canonical: 'https://iraqsm.com/fx' },
  keywords: [
    'سعر الدولار اليوم في العراق', 'سعر الدولار مقابل الدينار العراقي',
    'الدولار مقابل الدينار العراقي', 'دولار مقابل دينار عراقي',
    'سعر صرف الدولار في العراق اليوم', 'العملة العراقية مقابل الدولار',
    'سعر 100 دولار بالدينار العراقي', 'سعر صرف الدينار العراقي',
    'الدينار العراقي مقابل الدولار', 'سعر الدولار في بغداد اليوم',
    'usd to iqd', 'iqd to usd', 'iraqi dinar to dollar', 'dollar to iraqi dinar rate',
  ],
  openGraph: {
    url: 'https://iraqsm.com/fx',
    title: 'سعر الدولار اليوم في العراق | سعر صرف الدينار العراقي مقابل الدولار',
    description: 'سعر صرف الدولار مقابل الدينار العراقي اليوم — السعر الرسمي والسوق الموازية ومحول فوري IQD/USD.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

const fxSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://iraqsm.com/fx',
      url: 'https://iraqsm.com/fx',
      name: 'سعر الدولار اليوم في العراق — الدولار مقابل الدينار العراقي',
      description: 'سعر صرف الدولار الأمريكي مقابل الدينار العراقي اليوم، السعر الرسمي والسوق الموازية، ومحول العملات IQD/USD.',
      inLanguage: ['ar-IQ', 'en'],
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Iraq Stock Market', item: 'https://iraqsm.com' },
          { '@type': 'ListItem', position: 2, name: 'سعر الدولار في العراق', item: 'https://iraqsm.com/fx' },
        ],
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'كم سعر الدولار اليوم في العراق؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'سعر صرف الدولار الأمريكي مقابل الدينار العراقي يُحدّد بسعرين: السعر الرسمي للبنك المركزي العراقي (نحو 1320 ديناراً لكل دولار)، وسعر السوق الموازية (الحرة) الذي يتداول عادة أعلى قليلاً. تابع السعر المحدّث ومحول العملات على iraqsm.com/fx.',
          },
        },
        {
          '@type': 'Question',
          name: 'ما الفرق بين سعر الدولار الرسمي والموازي في العراق؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'السعر الرسمي هو السعر الذي يحدده البنك المركزي العراقي ويُستخدم في المعاملات الحكومية والمصرفية الرسمية ومزاد العملة. أما سعر السوق الموازية (الحرة) فهو سعر التداول الفعلي في محال الصرافة والأسواق، وغالباً ما يكون أعلى من السعر الرسمي.',
          },
        },
        {
          '@type': 'Question',
          name: 'كم سعر 100 دولار بالدينار العراقي اليوم؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '100 دولار أمريكي تساوي نحو 132,000 دينار عراقي بالسعر الرسمي الحالي. استخدم محول العملات في iraqsm.com/fx لحساب أي مبلغ بدقة على السعر الرسمي أو سعر السوق.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much is the US Dollar to Iraqi Dinar today?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The US Dollar trades against the Iraqi Dinar at two rates: the official Central Bank of Iraq rate (around 1,320 IQD per USD) and the parallel (market) rate, which is usually slightly higher. Use the live converter at iraqsm.com/fx.',
          },
        },
      ],
    },
  ],
}

export default function FxLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(fxSchema) }} />

      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        سعر الدولار اليوم في العراق — سعر صرف الدينار العراقي مقابل الدولار الأمريكي USD/IQD
      </h1>

      {children}

      {/* Server-rendered SEO content (Arabic — matches the top dollar queries).
          The converter above is the interactive part; this gives crawlers
          substantial, relevant text the client-only widget doesn't. */}
      <section
        dir="rtl"
        aria-label="سعر الدولار في العراق"
        style={{
          maxWidth: 800, margin: '0 auto', padding: '32px 24px 8px',
          borderTop: '1px solid var(--line, #1f2937)', lineHeight: 1.85,
          fontSize: 15, color: 'var(--ink3, #9ca3af)', textAlign: 'right',
        }}
      >
        <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink, #e5e7eb)', marginBottom: 14 }}>
          سعر الدولار اليوم في العراق مقابل الدينار العراقي
        </h2>
        <p style={{ marginBottom: 16 }}>
          يتابع العراقيون يومياً سعر صرف الدولار الأمريكي مقابل الدينار العراقي (USD/IQD)، إذ يؤثر هذا السعر مباشرة على
          الأسعار والتجارة والاستيراد. يوجد سعران رئيسيان: السعر الرسمي الذي يحدده البنك المركزي العراقي ويُعتمد في مزاد
          العملة والمعاملات الحكومية والمصرفية، وسعر السوق الموازية (الحرة) المتداوَل فعلياً في محال الصرافة والأسواق
          المحلية في بغداد وبقية المحافظات، والذي يكون عادة أعلى قليلاً من السعر الرسمي.
        </p>
        <p style={{ marginBottom: 24 }}>
          توفّر هذه الصفحة محوّل عملات فوري بين الدينار العراقي والدولار الأمريكي، إضافة إلى مقارنة بين السعر الرسمي،
          ومزاد العملة، وسعر السوق، وأسعار الحوالات. لحساب سعر أي مبلغ — مثل سعر 100 دولار بالدينار العراقي — أدخل القيمة
          في الحاسبة أعلاه واختر السعر المطلوب.
        </p>

        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink, #e5e7eb)', marginBottom: 12 }}>
          أسئلة شائعة عن سعر الدولار في العراق
        </h2>
        {[
          {
            q: 'كم سعر الدولار اليوم في العراق؟',
            a: 'يُحدّد سعر الدولار بسعرين: السعر الرسمي للبنك المركزي العراقي (نحو 1320 ديناراً لكل دولار)، وسعر السوق الموازية الذي يكون عادة أعلى قليلاً. تابع السعر المحدّث في الحاسبة وجدول المقارنة أعلى الصفحة.',
          },
          {
            q: 'ما الفرق بين سعر الدولار الرسمي والموازي؟',
            a: 'السعر الرسمي يحدده البنك المركزي ويُستخدم في المعاملات الرسمية ومزاد العملة، بينما سعر السوق الموازية (الحرة) هو سعر التداول الفعلي في محال الصرافة وغالباً ما يكون أعلى.',
          },
          {
            q: 'كم سعر 100 دولار بالدينار العراقي اليوم؟',
            a: '100 دولار تساوي نحو 132,000 دينار عراقي بالسعر الرسمي الحالي. استخدم المحوّل أعلاه لحساب أي مبلغ على السعر الرسمي أو سعر السوق.',
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
