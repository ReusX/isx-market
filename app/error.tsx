'use client'

import Link from 'next/link'
import { StatePage } from '@/components/system/StatePage'

/**
 * 500 · a route-level failure. A direct transplant of the approved surface.
 *
 * Three things the reader needs: it is on our side, their action was not
 * necessarily wrong, and they can retry. In that order, because the first one
 * is what stops them re-entering data they already entered correctly.
 *
 * ⚠ The `error` object is received and deliberately NOT rendered — no stack
 * trace, no digest, no internal code, no component name, and above all not the
 * raw provider message, which is English on an Arabic page at best and a
 * database schema hint at worst.
 *
 * `reset` is the real Next error-boundary reset, wired to the real button.
 * Nothing here simulates a failure to make the screen reachable.
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatePage
      scene="fault"
      code="500"
      title="حدث خطأ لدينا"
      note="تعذّر إكمال الطلب. المشكلة من جانبنا، ولم يحدث خطأ منك."
    >
      <div className="sp-actions">
        <button className="sp-primary" type="button" onClick={reset}>أعد المحاولة</button>
        <Link className="sp-secondary" href="/">العودة إلى الرئيسية</Link>
      </div>
      <p className="sp-hint">
        إن تكرّر الخطأ، أخبرنا عبر <Link href="/contact">تواصل معنا</Link>.
      </p>
    </StatePage>
  )
}
