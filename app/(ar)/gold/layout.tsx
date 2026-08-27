import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

export const metadata: Metadata = {
  title: { absolute: 'سعر الذهب اليوم في العراق · مثقال وغرام عيار 21 و24' },
  description: 'سعر الذهب اليوم في العراق بالدينار العراقي: سعر المثقال والغرام لعيار 24 و21 و18، مع السعر العالمي للأونصة وحاسبة تحوّل أي وزن إلى قيمته الحالية.',
  alternates: seoAlternates('/gold'),
  keywords: [
    'gold price in iraq', 'iraq gold price today', 'gold price iraq 2026',
    'gold price in iraqi dinar', 'iraq gold rate today',
    /* «سعر الذهب مباشر» dropped: the page prints a daily scrape, and the
       matching claim was already removed from this route's title and OG
       description. «اليوم» stays — gold IS refreshed daily. */
    'سعر الذهب اليوم', 'سعر الذهب اليوم في العراق',
    'اسعار الذهب عالميا', 'اسعار الذهب اليوم في العراق', 'سعر مثقال الذهب عيار 21',
    'سعر غرام الذهب في العراق', 'اسعار الذهب العراق اليوم',
    'سعر الذهب بالدينار العراقي',
  ],
  openGraph: {
    url: absUrl('/gold'),
    /* ⚠ «مباشر» removed from the OG TITLE. It stays in `keywords`, where it is a
       search term people type, not a claim the card makes — the source
       publishes one daily price list and this product re-reads it every three
       hours, which is not a live feed. */
    title: 'سعر الذهب اليوم في العراق · مثقال وغرام عيار 21 و24',
    description: 'سعر الذهب اليوم في العراق لكل غرام ومثقال بالدينار العراقي والدولار، مع السعر العالمي للأونصة. Iraq gold price per gram and mithqal.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': absUrl('/gold'),
      url: absUrl('/gold'),
      name: 'Gold Price in Iraq Today · Iraq Gold Rate in Iraqi Dinar',
      description: 'Gold price in Iraq in IQD and USD · per gram and mithqal for 24K, 21K and 18K gold.',
      inLanguage: ['ar-IQ', 'en'],
      about: {
        '@type': 'Thing',
        name: 'Gold Price in Iraq',
        sameAs: 'https://en.wikipedia.org/wiki/Gold_as_an_investment',
      },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'IQWealth', item: absUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Gold Price in Iraq', item: absUrl('/gold') },
        ],
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is the gold price in Iraq today?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The gold price in Iraq today is calculated from the international spot price (USD per troy ounce) converted to Iraqi Dinar at the current IQD/USD exchange rate. The most traded karat in Iraq is 21K (عيار 21). Check iraqsm.com/gold for the live rate.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is a mithqal of gold in Iraq?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A mithqal (مثقال) is the traditional unit of weight used in Iraqi gold markets, equal to 4.608 grams. The price of one mithqal of 21K gold (سعر مثقال الذهب عيار 21) is the most commonly quoted gold price in Iraqi souks and jewellery markets.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the gold price in Iraqi Dinar (IQD)?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The gold price in Iraqi Dinar tracks the international USD spot price converted at the current IQD/USD exchange rate. One gram of 21K gold in Iraq typically ranges between roughly 140,000 and 180,000 IQD (around 650,000–830,000 IQD per mithqal of 4.608 g) depending on the current global spot price.',
          },
        },
        {
          '@type': 'Question',
          name: 'سعر مثقال الذهب عيار 21 في العراق اليوم؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'سعر مثقال الذهب عيار 21 في العراق يُحسب بضرب السعر العالمي للذهب بالدولار في سعر صرف الدينار العراقي الحالي. المثقال يساوي 4.608 غرام. يتغيّر السعر يومياً تبعاً لأسواق السلع العالمية.',
          },
        },
        {
          '@type': 'Question',
          name: 'سعر غرام الذهب في العراق اليوم؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'سعر غرام الذهب في العراق اليوم يتحدد حسب العيار: عيار 24 (ذهب خالص) هو الأعلى سعراً، يليه عيار 21 الأكثر تداولاً في الأسواق العراقية، ثم عيار 18. يمكن حساب السعر الدقيق بالدينار العراقي عبر حاسبة الذهب في iraqsm.com/gold.',
          },
        },
      ],
    },
  ],
}

export default function GoldLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {children}

      {/* Server-rendered SEO content (Arabic · matches the top gold queries).
          The price widget above is client-only, so this gives crawlers the
          substantial, relevant text the widget doesn't render server-side. */}
      <section
        dir="rtl"
        aria-label="سعر الذهب في العراق"
        style={{
          maxWidth: 800, margin: '0 auto', padding: '32px 24px 8px',
          borderTop: '1px solid var(--line, #1f2937)', lineHeight: 1.85,
          fontSize: 15, color: 'var(--ink3, #9ca3af)', textAlign: 'right',
        }}
      >
        <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink, #e5e7eb)', marginBottom: 14 }}>
          سعر الذهب اليوم في العراق بالدينار العراقي
        </h2>
        <p style={{ marginBottom: 16 }}>
          يُحسب سعر الذهب في العراق من السعر العالمي للأونصة بالدولار الأمريكي، مضروباً في سعر صرف الدينار العراقي مقابل
          الدولار. الوحدة الأكثر استخداماً في الأسواق العراقية هي المثقال (يساوي 4.608 غرام)، والعيار الأكثر تداولاً هو
          عيار 21. تتغيّر الأسعار يومياً تبعاً لأسواق الذهب العالمية وسعر صرف الدولار.
        </p>
        <p style={{ marginBottom: 24 }}>
          توفّر هذه الصفحة سعر الذهب اليوم في العراق لكل غرام ومثقال بعياراته المختلفة (24 و21 و18) بالدينار العراقي
          والدولار الأمريكي، مع حاسبة تتيح تحويل أي وزن إلى قيمته الحالية.
        </p>

        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink, #e5e7eb)', marginBottom: 12 }}>
          أسئلة شائعة عن سعر الذهب في العراق
        </h2>
        {[
          {
            q: 'كم سعر مثقال الذهب عيار 21 في العراق اليوم؟',
            a: 'سعر مثقال الذهب عيار 21 يُحسب من السعر العالمي للذهب بالدولار مضروباً في سعر صرف الدينار العراقي. المثقال يساوي 4.608 غرام، وعيار 21 هو الأكثر تداولاً في الأسواق العراقية. تابع السعر المحدّث في حاسبة الذهب أعلى الصفحة.',
          },
          {
            q: 'كم سعر غرام الذهب في العراق اليوم؟',
            a: 'يتحدد سعر غرام الذهب حسب العيار: عيار 24 (ذهب خالص) هو الأعلى، يليه عيار 21 الأكثر تداولاً، ثم عيار 18. يمكن حساب السعر الدقيق بالدينار العراقي عبر الحاسبة أعلاه.',
          },
          {
            q: 'ما هو المثقال وكم يساوي بالغرام؟',
            a: 'المثقال وحدة وزن تقليدية تُستخدم في أسواق الذهب العراقية ويساوي 4.608 غرام. سعر مثقال الذهب عيار 21 هو السعر الأكثر تداولاً في الصاغة والأسواق المحلية.',
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
