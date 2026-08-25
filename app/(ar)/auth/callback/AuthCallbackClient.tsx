'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthError, Outcome } from '@/components/auth/AuthShell'
import type { AuthErrorId } from '@/lib/auth'

/**
 * The email-link landing page.
 *
 * Nothing is exchanged by hand. `detectSessionInUrl` is on by default in the
 * browser client, so the SDK consumes the code or the hash fragment itself;
 * this page waits for the resulting session rather than racing it, which is
 * the same shape /auth/reset uses and the reason that page works. Waiting via
 * BOTH `onAuthStateChange` and one `getSession` covers the case where the
 * exchange finished before this component mounted.
 *
 * An error in the URL is read straight from the query or the hash — an expired
 * link is by far the most common way to arrive here — and rendered through the
 * shared dictionary. The SDK's own English string is never shown.
 */
export default function AuthCallbackClient() {
  const { locale } = useLocale()
  const router = useRouter()
  const isAr = locale === 'ar'
  const [error, setError] = useState<AuthErrorId | null>(null)

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const err = search.get('error_description') || search.get('error')
      || hash.get('error_description') || hash.get('error')
    if (err) {
      setError(/expired|invalid/i.test(err) ? 'expired' : 'unknown')
      return
    }

    const sb = createClient()
    let done = false
    const settle = () => { if (!done) { done = true; router.replace('/profile') } }

    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => { if (session) settle() })
    sb.auth.getSession().then(({ data }) => { if (data.session) settle() })

    // If no session arrives, the link did not carry a usable one.
    const t = setTimeout(() => { if (!done) setError('expired') }, 8000)
    return () => { sub.subscription.unsubscribe(); clearTimeout(t) }
  }, [router])

  return (
    <AuthShell title={isAr ? 'تأكيد الحساب' : 'Confirming your account'}>
      {error ? (
        <>
          <AuthError id={error} locale={locale} />
          <Outcome tone="bad" title={isAr ? 'الرابط لم يعد صالحاً' : 'This link is no longer valid'}
            actions={
              <>
                <Link className="au-submit" href="/verify-email">
                  {isAr ? 'طلب رابط جديد' : 'Request a new link'}
                </Link>
                <Link href="/login">{isAr ? 'تسجيل الدخول' : 'Sign in'}</Link>
              </>
            }>
            <p>
              {isAr
                ? 'روابط التأكيد صالحة لفترة محدودة، وتُستخدم مرة واحدة. اطلب رابطاً جديداً وافتحه من الجهاز نفسه.'
                : 'Confirmation links expire and can be used once. Request a new one and open it on this device.'}
            </p>
          </Outcome>
        </>
      ) : (
        <Outcome title={isAr ? 'جارٍ تأكيد حسابك' : 'Confirming your account'}>
          <p>{isAr ? 'لحظة واحدة…' : 'One moment…'}</p>
        </Outcome>
      )}
    </AuthShell>
  )
}
