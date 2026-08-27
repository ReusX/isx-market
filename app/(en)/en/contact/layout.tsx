import type { Metadata } from 'next'
import { absUrl, seoAlternates } from '@/lib/seo'

/** `/en/contact`. No team is claimed here either — see the Arabic layout. */
export const metadata: Metadata = {
  title: 'Contact IQWealth · Email and direct channels',
  description:
    'Reach us about Iraq Stock Exchange data, a correction, an account issue or a partnership enquiry — a direct email address and a published phone number.',
  alternates: seoAlternates('/contact', 'en'),
  openGraph: {
    url: absUrl('/contact', 'en'),
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    locale: 'en_US',
    alternateLocale: 'ar_IQ',
  },
}

export default function EnContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
