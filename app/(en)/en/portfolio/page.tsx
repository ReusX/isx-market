import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { Portfolio } from '@/components/routes/Portfolio'

/**
 * `/en/portfolio`.
 *
 * ⚠ Mirrored for USABILITY, not for search. It stays `noindex`, it is absent
 * from the sitemap, and the registry classes it `private` so no hreflang pair
 * is emitted. An English reader who signs in should be able to use the
 * product; that is the whole reason this file exists.
 */
export const metadata: Metadata = {
  title: 'Portfolio · track your Iraq Stock Exchange holdings',
  description: 'Follow your portfolio’s value, unrealised P&L and sector allocation, computed from official Iraq Stock Exchange closing prices.',
  robots: { index: false, follow: false },
  alternates: seoAlternates('/portfolio', 'en'),
}

export default function Page() {
  return <Portfolio />
}
