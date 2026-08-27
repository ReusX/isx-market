import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'
import { Suspense } from 'react'
import { ForgotPasswordScreen } from '@/components/auth/screens'

export const metadata: Metadata = {
  title: 'Reset your password · IQWealth',
  description: 'We’ll send a link to set a new password for your account.',
  robots: { index: false, follow: false },
  /* Self-canonical, not the root's. Without this the page inherits
     `canonical: https://iraqsm.com` from the root layout and tells a
     crawler it is a duplicate of the homepage — a false statement, even
     on a noindex page. Matches /portfolio and /alerts, which already
     carry their own. */
  alternates: seoAlternates('/forgot-password', 'en'),
}

export default function Page() {
  return <Suspense><ForgotPasswordScreen /></Suspense>
}
