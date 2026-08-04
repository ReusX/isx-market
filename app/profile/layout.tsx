import type { Metadata } from 'next'

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
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
