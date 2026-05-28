import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'سعر الذهب اليوم في العراق | Iraq Gold Rate in IQD' },
  description: 'Gold price in Iraq today in IQD and USD — iraq gold rate today per gram and mithqal for 24K, 21K, 18K. سعر الذهب اليوم في العراق بالدينار العراقي، سعر مثقال الذهب عيار 21، سعر غرام الذهب في العراق، اسعار الذهب العراق اليوم.',
  alternates: { canonical: 'https://iraqsm.com/gold' },
  keywords: [
    'gold price in iraq', 'iraq gold price today', 'gold price iraq 2026',
    'gold price in iraqi dinar', 'iraq gold rate today',
    'سعر الذهب اليوم في العراق', 'سعر مثقال الذهب عيار 21',
    'سعر غرام الذهب في العراق', 'اسعار الذهب العراق اليوم',
    'سعر الذهب بالدينار العراقي',
  ],
  openGraph: {
    url: 'https://iraqsm.com/gold',
    title: 'Gold Price in Iraq Today | Iraq Gold Rate — سعر الذهب اليوم في العراق',
    description: 'Iraq gold price today per gram and mithqal in IQD & USD. سعر مثقال الذهب عيار 21 في العراق اليوم، اسعار الذهب العراق.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://iraqsm.com/gold',
      url: 'https://iraqsm.com/gold',
      name: 'Gold Price in Iraq Today — Iraq Gold Rate in Iraqi Dinar',
      description: 'Live gold price in Iraq today in IQD and USD — per gram and mithqal for 24K, 21K, and 18K gold.',
      inLanguage: ['ar-IQ', 'en'],
      about: {
        '@type': 'Thing',
        name: 'Gold Price in Iraq',
        sameAs: 'https://en.wikipedia.org/wiki/Gold_as_an_investment',
      },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Iraq Stock Market', item: 'https://iraqsm.com' },
          { '@type': 'ListItem', position: 2, name: 'Gold Price in Iraq', item: 'https://iraqsm.com/gold' },
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
            text: 'The gold price in Iraq today is calculated from the international spot price (USD per troy ounce) converted to Iraqi Dinar at the current IQD/USD exchange rate (~1310 IQD). The most traded karat in Iraq is 21K (عيار 21). Check iraqsm.com/gold for the live rate.',
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
            text: 'The gold price in Iraqi Dinar is the international USD spot price multiplied by the IQD/USD rate (approximately 1310 IQD per USD). One gram of 21K gold in Iraq typically ranges between 2,500,000 and 3,500,000 IQD depending on the current global spot price.',
          },
        },
        {
          '@type': 'Question',
          name: 'سعر مثقال الذهب عيار 21 في العراق اليوم؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'سعر مثقال الذهب عيار 21 في العراق يُحسب بضرب السعر العالمي للذهب بالدولار في سعر صرف الدينار العراقي (1310 دينار تقريباً لكل دولار). المثقال يساوي 4.608 غرام. يتغيّر السعر يومياً تبعاً لأسواق السلع العالمية.',
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
    </>
  )
}
