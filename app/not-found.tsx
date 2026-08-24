import Link from 'next/link'
import type { Metadata } from 'next'
import { StatePage, StateLinks } from '@/components/system/StatePage'

/**
 * 404 · «this page does not exist. Where can I go instead?»
 *
 * A direct transplant of the approved surface. The plate is the About
 * colonnade with one bay missing — the structure holds, one part is simply not
 * there. No sad robot, no broken chain.
 *
 * The destinations are chosen, not listed: the market is where most mistyped
 * company URLs were heading, the screener finds the company they actually
 * meant, and Learn is the one place a wrong link is often a stale article path.
 *
 * This renders inside the app frame on purpose. A failed route whose whole job
 * is «where can I go instead?» should not also take away the answer — which is
 * the one place the approved standalone composition would cost the reader
 * something real.
 */
export const metadata: Metadata = {
  title: 'الصفحة غير موجودة',
  // A 404 must never become an indexable content page.
  robots: { index: false, follow: true },
  /* And it must not inherit the root canonical either. Without this, every
     mistyped URL emits `<link rel="canonical" href="https://iraqsm.com">` and
     tells a crawler the 404 is a duplicate of the homepage. */
  alternates: { canonical: null },
}

export default function NotFound() {
  return (
    <StatePage
      scene="missing"
      code="404"
      title="لا توجد صفحة على هذا المسار"
      note="قد يكون الرابط قديماً، أو رمز الشركة غير صحيح."
    >
      <div className="sp-actions">
        <Link className="sp-primary" href="/">العودة إلى الرئيسية</Link>
      </div>
      <StateLinks
        items={[
          { href: '/market', label: 'حركة السوق' },
          { href: '/screener', label: 'فارز الأسهم' },
          { href: '/learn', label: 'تعلّم' },
        ]}
      />
      {/* A real shortcut: GlobalHeader binds `/` to the global search. */}
      <p className="sp-hint">
        أو اضغط <kbd>/</kbd> للبحث عن شركة بالاسم أو الرمز.
      </p>
    </StatePage>
  )
}
