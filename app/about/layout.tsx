import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'عن بورصة العراق | Iraq Stock Market & Exchange ISX' },
  description: 'iraqsm.com is the leading Iraq stock market tracker · live prices, charts, and analysis for the Iraq Stock Exchange (ISX). Built for Iraqi investors. منصة متابعة سوق الاسهم العراقي وبورصة العراق للأوراق المالية.',
  alternates: { canonical: 'https://iraqsm.com/about' },
  keywords: [
    'iraq stock market', 'iraq stock exchange', 'isx market', 'about',
    'بورصة العراق', 'سوق الاسهم العراقي', 'اسهم العراق',
  ],
  openGraph: {
    url: 'https://iraqsm.com/about',
    title: 'About Iraq Stock Market · iraqsm.com | عن بورصة العراق',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
