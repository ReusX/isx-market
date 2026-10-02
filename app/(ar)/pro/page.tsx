import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'
import { ProPage } from '@/components/site/ProPage'

export const metadata: Metadata = {
  title: { absolute: 'اشتراك برو · القوائم المالية الكاملة لشركات بورصة العراق' },
  description: 'القوائم المالية لكل السنوات والنسب المالية وتدفق المستثمرين الأجانب لكل شركة في بورصة العراق، باشتراك شهري بـ5,000 دينار أو سنوي بـ50,000 دينار.',
  alternates: seoAlternates('/pro'),
  openGraph: { url: absUrl('/pro'), title: 'IQWealth Pro', images: [{ url: '/opengraph-image', width: 1200, height: 630 }] },
}

export default function Page() {
  return <ProPage />
}
