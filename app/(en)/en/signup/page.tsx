import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { Suspense } from 'react'
import { SignUpScreen } from '@/components/auth/screens'

export const metadata: Metadata = {
  title: 'Create an account · IQWealth',
  description: 'Create a free IQWealth account to sync your portfolio and watchlist across your devices.',
  robots: { index: false, follow: false },
  /* Self-canonical, not the root's. Without this the page inherits
     `canonical: https://iraqsm.com` from the root layout and tells a
     crawler it is a duplicate of the homepage — a false statement, even
     on a noindex page. Matches /portfolio and /alerts, which already
     carry their own. */
  alternates: seoAlternates('/signup', 'en'),
}

export default function Page() {
  return <Suspense><SignUpScreen /></Suspense>
}
