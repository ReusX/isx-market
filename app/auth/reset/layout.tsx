import type { Metadata } from 'next'

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
}

export default function ResetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
