import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

export const metadata: Metadata = {
  title: { absolute: 'سعر النفط اليوم · برميل برنت وخام البصرة بالدينار' },
  description: 'سعر برميل النفط اليوم: برنت، غرب تكساس WTI، خام البصرة الثقيل والمتوسط وسلة أوبك — بالدولار وبالدينار العراقي، محدّثاً على مدار اليوم.',
  alternates: seoAlternates('/oil'),
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
    url: absUrl('/oil'),
    title: 'سعر النفط اليوم في العراق · برنت وخام البصرة وسلة أوبك · Iraq Oil Price',
    description: 'سعر برميل النفط اليوم: برنت، غرب تكساس WTI، خام البصرة، وسلة أوبك بالدولار والدينار العراقي. Brent, WTI, Basrah and OPEC basket prices.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': absUrl('/oil'),
      url: absUrl('/oil'),
      name: 'Oil Price Today in Iraq · Brent, WTI, Basrah Crude & OPEC Basket',
      description: 'Oil price in USD and Iraqi dinars per barrel · Brent, WTI, Basrah Heavy and Medium crude, Dubai and the OPEC basket.',
      inLanguage: ['ar-IQ', 'en'],
      about: { '@type': 'Thing', name: 'Oil Price', sameAs: 'https://en.wikipedia.org/wiki/Price_of_oil' },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'IQWealth', item: absUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Oil Price in Iraq', item: absUrl('/oil') },
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


      {children}
    </>
  )
}
