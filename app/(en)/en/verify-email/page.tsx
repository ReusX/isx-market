import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { Suspense } from 'react'
import { VerifyEmailScreen } from '@/components/auth/screens'

export const metadata: Metadata = {
  title: 'Check your email · IQWealth',
  description: 'Open the verification link we sent to your email address to activate your account.',
  robots: { index: false, follow: false },
  /* Self-canonical, not the root's. Without this the page inherits
     `canonical: https://iraqsm.com` from the root layout and tells a
     crawler it is a duplicate of the homepage — a false statement, even
     on a noindex page. Matches /portfolio and /alerts, which already
     carry their own. */
  alternates: seoAlternates('/verify-email', 'en'),
}

export default function Page() {
  return <Suspense><VerifyEmailScreen /></Suspense>
}
