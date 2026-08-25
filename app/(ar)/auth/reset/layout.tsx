import type { Metadata } from 'next'
import { seoAlternates } from '@/lib/seo'

/*
 * A recovery URL must never be indexed, and it must never be *crawled* either —
 * a fetch by a bot consumes the single-use code and hands the user an expired
 * link. Blocking it in robots.txt would stop Google reading the noindex, so the
 * directive that actually works is a noindex it is allowed to read, exactly as
 * on /profile.
 */
export const metadata: Metadata = {
  title: { absolute: 'كلمة مرور جديدة' },
  robots: { index: false, follow: false },
  /* Self-canonical, not the root's. Without this the page inherits
     `canonical: https://iraqsm.com` from the root layout and tells a
     crawler it is a duplicate of the homepage — a false statement, even
     on a noindex page. Matches /portfolio and /alerts, which already
     carry their own. */
  alternates: seoAlternates('/auth/reset'),
}

export default function ResetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
