import type { Metadata } from 'next'
import { MoneyStreet } from '@/components/learn/MoneyStreet'
import { loadStreet } from '@/lib/moneyStreet'
import { street } from '@/lib/moneyStreetCopy'
import { absUrl, seoAlternates } from '@/lib/seo'

/** «شارع المال» · Lesson 1 of the Learn platform. */
export const revalidate = 3600

export const metadata: Metadata = {
  title: street.meta.title,
  description: street.meta.description,
  alternates: seoAlternates('/learn/invest'),
  openGraph: {
    url: absUrl('/learn/invest'),
    title: street.meta.title,
    description: street.meta.description,
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
}

export default async function Page() {
  return <MoneyStreet data={await loadStreet()} />
}
