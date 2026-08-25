import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

/** `/en/privacy`. */
export const metadata: Metadata = {
  title: { absolute: 'Privacy Policy · what IQWealth collects and why' },
  description:
    'What IQWealth collects, why, where it is stored, and what you can ask for: four categories of data, one session cookie, six local-storage keys, and no advertising or data sale.',
  alternates: seoAlternates('/privacy', 'en'),
  openGraph: {
    url: absUrl('/privacy', 'en'),
    title: 'Privacy Policy · IQWealth',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function EnPrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
