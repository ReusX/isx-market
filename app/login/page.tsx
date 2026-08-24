import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginScreen } from '@/components/auth/screens'

export const metadata: Metadata = {
  title: 'تسجيل الدخول · IQWealth',
  description: 'سجّل الدخول إلى حسابك في IQWealth للوصول إلى محفظتك وقوائم متابعتك.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Suspense><LoginScreen /></Suspense>
}
