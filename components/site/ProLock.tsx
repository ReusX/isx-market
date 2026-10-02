'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import '@/styles/pro.css'

/** The card shown where «برو» data would continue: what is locked, and the way in. */
export function ProLock({ body }: { body?: string }) {
  const { t, href: L } = useLocale()
  const P = t.pro.lock
  return (
    <aside className="pro-lock id-print is-calm" data-world="ochre">
      <p className="pro-lock-h"><i aria-hidden="true" />{P.title}</p>
      <p className="pro-lock-b">{body ?? P.body}</p>
      <Link className="pro-buy" href={L('/pro')}>{P.cta}</Link>
    </aside>
  )
}
