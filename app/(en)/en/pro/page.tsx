import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { ProPage } from '@/components/site/ProPage'

export const metadata: Metadata = {
  title: { absolute: 'IQWealth Pro · Full financial statements for Iraq Stock Exchange companies' },
  description: 'Every year of financial statements, the full ratios and foreign investor flow for each company on the Iraq Stock Exchange: 5,000 IQD a month or 50,000 IQD a year.',
  alternates: seoAlternates('/pro', 'en'),
  openGraph: { url: absUrl('/pro', 'en'), title: 'IQWealth Pro', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}

export default function Page() {
  return <ProPage />
}
