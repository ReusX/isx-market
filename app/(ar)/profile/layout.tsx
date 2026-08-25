import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'

/*
 * The page is a client component and cannot export metadata itself.
 *
 * This replaces the `Disallow: /profile` that used to sit in app/robots.ts:
 * blocking the URL stopped Google fetching it, which meant it never saw a
 * noindex — and a blocked URL can still surface in results as a bare link.
 * A noindex it is allowed to read is the directive that actually works.
 */
export const metadata: Metadata = {
  title: { absolute: 'حسابي' },
  robots: { index: false, follow: false },
  /* Self-canonical, not the root's. Without this the page inherits
     `canonical: https://iraqsm.com` from the root layout and tells a
     crawler it is a duplicate of the homepage — a false statement, even
     on a noindex page. Matches /portfolio and /alerts, which already
     carry their own. */
  alternates: seoAlternates('/profile'),
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
